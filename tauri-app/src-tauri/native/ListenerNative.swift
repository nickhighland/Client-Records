import AppKit
import AudioToolbox
import AVFoundation
import CoreAudio
import CoreMedia
import Darwin
import Foundation
import FoundationModels
import Speech

public typealias ListenerEventCallback = @convention(c) (UnsafePointer<CChar>?) -> Void

private enum ListenerNativeError: LocalizedError {
    case message(String)

    var errorDescription: String? {
        switch self {
        case .message(let message): return message
        }
    }
}

private final class ListenerEventHub: @unchecked Sendable {
    static let shared = ListenerEventHub()

    private let lock = NSLock()
    private var callback: ListenerEventCallback?

    func setCallback(_ callback: ListenerEventCallback?) {
        lock.lock()
        self.callback = callback
        lock.unlock()
    }

    func emit(_ payload: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }

        lock.lock()
        let currentCallback = callback
        lock.unlock()

        json.withCString { pointer in
            currentCallback?(pointer)
        }
    }
}

private func jsonCString(_ object: Any) -> UnsafeMutablePointer<CChar>? {
    guard JSONSerialization.isValidJSONObject(object),
          let data = try? JSONSerialization.data(withJSONObject: object),
          let json = String(data: data, encoding: .utf8) else { return strdup("{}") }
    return strdup(json)
}

private func statusMessage(_ status: OSStatus) -> String {
    let bigEndian = UInt32(bitPattern: status).bigEndian
    let characters = withUnsafeBytes(of: bigEndian) { bytes in
        bytes.map { byte -> Character in
            byte >= 32 && byte <= 126 ? Character(UnicodeScalar(byte)) : "?"
        }
    }
    let code = String(characters)
    return code == "????" ? String(status) : "\(code) (\(status))"
}

private func checkStatus(_ status: OSStatus, _ operation: String) throws {
    guard status == noErr else {
        throw ListenerNativeError.message("\(operation) failed: \(statusMessage(status)).")
    }
}

private struct ListenerBinding: Codable, Sendable {
    let listenerSessionId: String
    let clientId: String
    let appointmentId: String

    var eventFields: [String: Any] {
        [
            "listenerSessionId": listenerSessionId,
            "clientId": clientId,
            "appointmentId": appointmentId
        ]
    }
}

private struct ListenerStartRequest: Decodable, Sendable {
    let listenerSessionId: String
    let clientId: String
    let appointmentId: String
    let telehealthBundleId: String
    let telehealthProcessIds: [UInt32]?
    let captureAllSystemAudio: Bool?
    let locale: String?
    let vocabulary: [String]?

    var binding: ListenerBinding {
        ListenerBinding(
            listenerSessionId: listenerSessionId,
            clientId: clientId,
            appointmentId: appointmentId
        )
    }
}

private struct ListenerDraftRequest: Decodable, Sendable {
    let listenerSessionId: String
    let clientId: String
    let appointmentId: String
    let transcript: String
    let clinicalContext: String?

    var binding: ListenerBinding {
        ListenerBinding(
            listenerSessionId: listenerSessionId,
            clientId: clientId,
            appointmentId: appointmentId
        )
    }
}

private func eventPayload(type: String, binding: ListenerBinding?, values: [String: Any] = [:]) -> [String: Any] {
    var payload = values
    let emittedAt = Date()
    payload["type"] = type
    payload["timestamp"] = ISO8601DateFormatter().string(from: emittedAt)
    payload["timestampMs"] = Int64((emittedAt.timeIntervalSince1970 * 1_000).rounded())
    binding?.eventFields.forEach { payload[$0.key] = $0.value }
    return payload
}

private enum CoreAudioProcesses {
    static let propertyAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyProcessObjectList,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )

    static func objectIds() throws -> [AudioObjectID] {
        var address = propertyAddress
        var size: UInt32 = 0
        try checkStatus(
            AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size),
            "Reading the system audio process list"
        )
        guard size > 0 else { return [] }

        let count = Int(size) / MemoryLayout<AudioObjectID>.stride
        var ids = Array(repeating: AudioObjectID(kAudioObjectUnknown), count: count)
        let status = ids.withUnsafeMutableBytes { buffer in
            AudioObjectGetPropertyData(
                AudioObjectID(kAudioObjectSystemObject),
                &address,
                0,
                nil,
                &size,
                buffer.baseAddress!
            )
        }
        try checkStatus(status, "Loading the system audio process list")
        return ids
    }

    static func processId(for objectId: AudioObjectID) -> pid_t? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioProcessPropertyPID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var pid: pid_t = 0
        var size = UInt32(MemoryLayout<pid_t>.size)
        guard AudioObjectGetPropertyData(objectId, &address, 0, nil, &size, &pid) == noErr, pid > 0 else {
            return nil
        }
        return pid
    }

    static func bundleId(for objectId: AudioObjectID) -> String? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioProcessPropertyBundleID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var value: CFString?
        var size = UInt32(MemoryLayout<CFString?>.size)
        guard AudioObjectGetPropertyData(objectId, &address, 0, nil, &size, &value) == noErr else {
            return nil
        }
        return value as String?
    }

    static func isRunningOutput(_ objectId: AudioObjectID) -> Bool {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioProcessPropertyIsRunningOutput,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var value: UInt32 = 0
        var size = UInt32(MemoryLayout<UInt32>.size)
        return AudioObjectGetPropertyData(objectId, &address, 0, nil, &size, &value) == noErr && value != 0
    }

    static func ids(bundleId: String) -> [AudioObjectID] {
        (try? objectIds())?.filter { objectId in
            self.bundleId(for: objectId) == bundleId
        } ?? []
    }

    static func sourceList() throws -> [[String: Any]] {
        struct Source {
            var name: String
            var bundleId: String
            var processIds: [AudioObjectID]
            var running: Bool
        }

        var grouped: [String: Source] = [:]
        for objectId in try objectIds() {
            guard let pid = processId(for: objectId), pid != getpid(),
                  let audioBundleId = bundleId(for: objectId), !audioBundleId.isEmpty else { continue }

            let runningApplication = NSRunningApplication(processIdentifier: pid)
            let appBundleId = runningApplication?.bundleIdentifier ?? audioBundleId
            let name = runningApplication?.localizedName
                ?? appBundleId.split(separator: ".").last.map(String.init)
                ?? appBundleId
            let key = audioBundleId
            var source = grouped[key] ?? Source(
                name: name,
                bundleId: audioBundleId,
                processIds: [],
                running: false
            )
            source.processIds.append(objectId)
            source.running = source.running || isRunningOutput(objectId)
            grouped[key] = source
        }

        return grouped.values
            .sorted {
                if $0.running != $1.running { return $0.running && !$1.running }
                return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
            .map { source in
                [
                    "id": source.bundleId,
                    "name": source.name,
                    "bundleId": source.bundleId,
                    "processIds": source.processIds.map { UInt32($0) },
                    "isProducingAudio": source.running
                ]
            }
    }
}

private func copyAudioBuffer(_ source: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    guard let copy = AVAudioPCMBuffer(pcmFormat: source.format, frameCapacity: source.frameLength) else {
        return nil
    }
    copy.frameLength = source.frameLength
    let sourceBuffers = UnsafeMutableAudioBufferListPointer(source.mutableAudioBufferList)
    let destinationBuffers = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for index in 0..<min(sourceBuffers.count, destinationBuffers.count) {
        guard let sourceData = sourceBuffers[index].mData,
              let destinationData = destinationBuffers[index].mData else { continue }
        let byteCount = min(sourceBuffers[index].mDataByteSize, destinationBuffers[index].mDataByteSize)
        memcpy(destinationData, sourceData, Int(byteCount))
        destinationBuffers[index].mDataByteSize = byteCount
    }
    return copy
}

private func copyAudioBufferList(_ source: UnsafePointer<AudioBufferList>, format: AVAudioFormat) -> AVAudioPCMBuffer? {
    let sourceBuffers = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: source))
    guard let firstBuffer = sourceBuffers.first,
          format.streamDescription.pointee.mBytesPerFrame > 0 else { return nil }
    let frameCount = AVAudioFrameCount(firstBuffer.mDataByteSize / format.streamDescription.pointee.mBytesPerFrame)
    guard frameCount > 0,
          let copy = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return nil }
    copy.frameLength = frameCount

    let destinationBuffers = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for index in 0..<min(sourceBuffers.count, destinationBuffers.count) {
        guard let sourceData = sourceBuffers[index].mData,
              let destinationData = destinationBuffers[index].mData else { continue }
        let byteCount = min(sourceBuffers[index].mDataByteSize, destinationBuffers[index].mDataByteSize)
        memcpy(destinationData, sourceData, Int(byteCount))
        destinationBuffers[index].mDataByteSize = byteCount
    }
    return copy
}

private struct AudioSignalFeatures {
    let levelDecibels: Float
    let crestFactor: Float
    let zeroCrossingRate: Float
    let envelopeRangeDecibels: Float
}

private struct AudioFeatureAccumulator {
    var sum: Double = 0
    var peak: Double = 0
    var sampleCount = 0
    var zeroCrossings = 0
    var previousSample: Double?
    var envelopeSums = SIMD4<Double>(repeating: 0)
    var envelopeCounts = SIMD4<Double>(repeating: 0)

    mutating func beginChannel() {
        previousSample = nil
    }

    mutating func add(_ value: Double, index: Int, count: Int) {
        let square = value * value
        sum += square
        peak = max(peak, abs(value))
        sampleCount += 1
        if let previousSample,
           (previousSample < 0 && value >= 0) || (previousSample >= 0 && value < 0) {
            zeroCrossings += 1
        }
        self.previousSample = value
        let envelopeIndex = min(3, index * 4 / max(1, count))
        envelopeSums[envelopeIndex] += square
        envelopeCounts[envelopeIndex] += 1
    }

    func features() -> AudioSignalFeatures? {
        guard sampleCount > 0 else { return nil }
        let rms = sqrt(sum / Double(sampleCount))
        let levelDecibels = 20 * log10(max(rms, 0.000_001))
        var minimumEnvelopeLevel = Double.infinity
        var maximumEnvelopeLevel = -Double.infinity
        for index in 0..<4 where envelopeCounts[index] > 0 {
            let level = 20 * log10(max(sqrt(envelopeSums[index] / envelopeCounts[index]), 0.000_001))
            minimumEnvelopeLevel = min(minimumEnvelopeLevel, level)
            maximumEnvelopeLevel = max(maximumEnvelopeLevel, level)
        }
        let envelopeRange = minimumEnvelopeLevel.isFinite && maximumEnvelopeLevel.isFinite
            ? maximumEnvelopeLevel - minimumEnvelopeLevel
            : 0
        return AudioSignalFeatures(
            levelDecibels: Float(levelDecibels),
            crestFactor: Float(peak / max(rms, 0.000_001)),
            zeroCrossingRate: Float(zeroCrossings) / Float(max(1, sampleCount - 1)),
            envelopeRangeDecibels: Float(envelopeRange)
        )
    }
}

private func audioSignalFeatures(of buffer: AVAudioPCMBuffer) -> AudioSignalFeatures? {
    let buffers = UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList)
    var accumulator = AudioFeatureAccumulator()

    for audioBuffer in buffers {
        guard let data = audioBuffer.mData else { continue }
        accumulator.beginChannel()
        switch buffer.format.commonFormat {
        case .pcmFormatFloat32:
            let values = data.assumingMemoryBound(to: Float.self)
            let count = Int(audioBuffer.mDataByteSize) / MemoryLayout<Float>.stride
            for index in 0..<count {
                accumulator.add(Double(values[index]), index: index, count: count)
            }
        case .pcmFormatFloat64:
            let values = data.assumingMemoryBound(to: Double.self)
            let count = Int(audioBuffer.mDataByteSize) / MemoryLayout<Double>.stride
            for index in 0..<count {
                accumulator.add(values[index], index: index, count: count)
            }
        case .pcmFormatInt16:
            let values = data.assumingMemoryBound(to: Int16.self)
            let count = Int(audioBuffer.mDataByteSize) / MemoryLayout<Int16>.stride
            for index in 0..<count {
                accumulator.add(
                    Double(values[index]) / Double(Int16.max),
                    index: index,
                    count: count
                )
            }
        case .pcmFormatInt32:
            let values = data.assumingMemoryBound(to: Int32.self)
            let count = Int(audioBuffer.mDataByteSize) / MemoryLayout<Int32>.stride
            for index in 0..<count {
                accumulator.add(
                    Double(values[index]) / Double(Int32.max),
                    index: index,
                    count: count
                )
            }
        case .otherFormat:
            continue
        @unknown default:
            continue
        }
    }

    return accumulator.features()
}

private func silenceAudioBuffer(_ buffer: AVAudioPCMBuffer) {
    for audioBuffer in UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList) {
        guard let data = audioBuffer.mData else { continue }
        memset(data, 0, Int(audioBuffer.mDataByteSize))
    }
}

private struct AdaptiveSpeechActivityDetector {
    private var noiseFloorDecibels: Float = -58
    private var previousLevelDecibels: Float = -120
    private var candidateFrames = 0
    private var speechActive = false
    private var hangoverUntil = Date.distantPast

    mutating func process(_ features: AudioSignalFeatures, capturedAt: Date) -> Bool {
        let level = features.levelDecibels
        let signalToNoise = level - noiseFloorDecibels
        let frameChange = abs(level - previousLevelDecibels)
        let voiceShaped = features.zeroCrossingRate >= 0.004
            && features.zeroCrossingRate <= 0.34
            && features.crestFactor >= 1.3
            && features.crestFactor <= 12
        let changingEnvelope = frameChange >= 0.9
        let detailedEnvelope = frameChange >= 0.4
            && features.envelopeRangeDecibels >= 2
        let strongSpeech = level >= -28 && signalToNoise >= 4
        let candidate = level >= -52
            && signalToNoise >= 6
            && voiceShaped
            && (changingEnvelope || detailedEnvelope || strongSpeech)

        if speechActive {
            let continuesSpeech = level >= -55
                && signalToNoise >= 2.5
                && features.zeroCrossingRate <= 0.4
            if candidate || continuesSpeech {
                hangoverUntil = capturedAt.addingTimeInterval(0.22)
            } else if capturedAt > hangoverUntil {
                speechActive = false
                candidateFrames = 0
            }
        } else {
            candidateFrames = candidate ? candidateFrames + 1 : 0
            if candidateFrames >= 2 {
                speechActive = true
                hangoverUntil = capturedAt.addingTimeInterval(0.22)
            }
        }

        if !speechActive && !candidate {
            let targetLevel = min(-20, max(-90, level))
            let adaptation: Float = targetLevel < noiseFloorDecibels ? 0.12 : 0.025
            noiseFloorDecibels += adaptation * (targetLevel - noiseFloorDecibels)
        }
        previousLevelDecibels = level
        return speechActive
    }
}

private func adaptiveSpeechDetectorSelfTest() -> Bool {
    let hum = AudioSignalFeatures(
        levelDecibels: -25,
        crestFactor: 1.42,
        zeroCrossingRate: 0.001,
        envelopeRangeDecibels: 0.1
    )
    let whiteNoise = AudioSignalFeatures(
        levelDecibels: -30,
        crestFactor: 3.2,
        zeroCrossingRate: 0.48,
        envelopeRangeDecibels: 0.3
    )
    let speechFrames = [-28.0, -22.0, -26.0].map { level in
        AudioSignalFeatures(
            levelDecibels: Float(level),
            crestFactor: 2.8,
            zeroCrossingRate: 0.09,
            envelopeRangeDecibels: 2.1
        )
    }
    let silence = AudioSignalFeatures(
        levelDecibels: -90,
        crestFactor: 1,
        zeroCrossingRate: 0,
        envelopeRangeDecibels: 0
    )

    func staysInactive(for feature: AudioSignalFeatures) -> Bool {
        var detector = AdaptiveSpeechActivityDetector()
        var timestamp = Date(timeIntervalSince1970: 0)
        for _ in 0..<40 {
            timestamp = timestamp.addingTimeInterval(0.02)
            if detector.process(feature, capturedAt: timestamp) { return false }
        }
        return true
    }

    guard staysInactive(for: hum), staysInactive(for: whiteNoise) else { return false }

    var detector = AdaptiveSpeechActivityDetector()
    var timestamp = Date(timeIntervalSince1970: 0)
    for index in 0..<40 {
        timestamp = timestamp.addingTimeInterval(0.02)
        let backgroundNoise = AudioSignalFeatures(
            levelDecibels: index.isMultiple(of: 2) ? -33.75 : -34.25,
            crestFactor: 2.4,
            zeroCrossingRate: 0.12,
            envelopeRangeDecibels: 0.5
        )
        if detector.process(backgroundNoise, capturedAt: timestamp) { return false }
    }
    var detectedSpeech = false
    for feature in speechFrames {
        timestamp = timestamp.addingTimeInterval(0.02)
        detectedSpeech = detector.process(feature, capturedAt: timestamp) || detectedSpeech
    }
    guard detectedSpeech else { return false }
    for _ in 0..<20 {
        timestamp = timestamp.addingTimeInterval(0.02)
        _ = detector.process(silence, capturedAt: timestamp)
    }
    return !detector.process(silence, capturedAt: timestamp.addingTimeInterval(0.02))
}

private struct SystemSpeechActivityHistory {
    private var speechFrameTimes: [TimeInterval] = []

    mutating func recordSpeech(at capturedAt: Date) {
        let timestamp = capturedAt.timeIntervalSinceReferenceDate
        speechFrameTimes.append(timestamp)
        prune(before: timestamp - 2)
        if speechFrameTimes.count > 256 {
            speechFrameTimes.removeFirst(speechFrameTimes.count - 256)
        }
    }

    mutating func containsSpeech(
        around capturedAt: Date,
        lookBehind: TimeInterval,
        lookAhead: TimeInterval
    ) -> Bool {
        let timestamp = capturedAt.timeIntervalSinceReferenceDate
        prune(before: timestamp - max(2, lookBehind + 1))
        let lowerBound = timestamp - lookBehind
        let upperBound = timestamp + lookAhead
        return speechFrameTimes.contains { $0 >= lowerBound && $0 <= upperBound }
    }

    private mutating func prune(before threshold: TimeInterval) {
        guard let firstRetainedIndex = speechFrameTimes.firstIndex(where: { $0 >= threshold }) else {
            speechFrameTimes.removeAll(keepingCapacity: true)
            return
        }
        if firstRetainedIndex > 0 {
            speechFrameTimes.removeFirst(firstRetainedIndex)
        }
    }
}

private func systemSpeechActivityHistorySelfTest() -> Bool {
    var history = SystemSpeechActivityHistory()
    let microphoneFrame = Date(timeIntervalSinceReferenceDate: 100)

    history.recordSpeech(at: microphoneFrame.addingTimeInterval(0.04))
    history.recordSpeech(at: microphoneFrame.addingTimeInterval(0.9))

    guard history.containsSpeech(around: microphoneFrame, lookBehind: 0.35, lookAhead: 0.55) else {
        return false
    }
    guard !history.containsSpeech(
        around: microphoneFrame.addingTimeInterval(2),
        lookBehind: 0.35,
        lookAhead: 0.55
    ) else {
        return false
    }
    return true
}

private final class SystemAudioActivityGate: @unchecked Sendable {
    private let lock = NSLock()
    private var detector = AdaptiveSpeechActivityDetector()
    private var speechHistory = SystemSpeechActivityHistory()

    func recordSystemAudio(_ buffer: AVAudioPCMBuffer, capturedAt: Date) {
        guard let features = audioSignalFeatures(of: buffer) else { return }
        lock.withLock {
            if detector.process(features, capturedAt: capturedAt) {
                speechHistory.recordSpeech(at: capturedAt)
            }
        }
    }

    func shouldSuppressMicrophone(capturedAt: Date) -> Bool {
        lock.withLock {
            speechHistory.containsSpeech(
                around: capturedAt,
                lookBehind: 0.35,
                lookAhead: 0.55
            )
        }
    }
}

private final class ListenerSequenceCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var value: UInt64 = 0

    func next() -> UInt64 {
        lock.withLock {
            value += 1
            return value
        }
    }
}

@available(macOS 26.0, *)
private final class SpeechChannel: @unchecked Sendable {
    private let source: String
    private let binding: ListenerBinding
    private let queue: DispatchQueue
    private let stateLock = NSLock()
    private var paused = false
    private var stopped = false
    private var lastLevelEvent = Date.distantPast
    private var lastDropWarning = Date.distantPast
    private let sequenceCounter = ListenerSequenceCounter()
    private var converter: AVAudioConverter?
    private var converterSourceFormat: AVAudioFormat?
    private var targetFormat: AVAudioFormat?
    private var continuation: AsyncStream<AnalyzerInput>.Continuation?
    private var analyzer: SpeechAnalyzer?
    private var analysisTask: Task<Void, Never>?
    private var resultTask: Task<Void, Never>?

    init(source: String, binding: ListenerBinding) {
        self.source = source
        self.binding = binding
        self.queue = DispatchQueue(label: "com.smartemr.listener.speech.\(source)", qos: .userInitiated)
    }

    func prepare(localeIdentifier: String, vocabulary: [String]) async throws {
        let requestedLocale = Locale(identifier: localeIdentifier)
        guard SpeechTranscriber.isAvailable,
              let supportedLocale = await SpeechTranscriber.supportedLocale(equivalentTo: requestedLocale) else {
            throw ListenerNativeError.message("On-device transcription is not available for \(localeIdentifier).")
        }

        let transcriber = SpeechTranscriber(locale: supportedLocale, preset: .timeIndexedProgressiveTranscription)
        if await AssetInventory.status(forModules: [transcriber]) != .installed,
           let installation = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
            ListenerEventHub.shared.emit(eventPayload(
                type: "state",
                binding: binding,
                values: ["state": "preparing", "message": "Preparing the on-device \(source) speech model..."]
            ))
            try await installation.downloadAndInstall()
        }

        guard let audioFormat = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [transcriber]) else {
            throw ListenerNativeError.message("No compatible audio format is available for on-device transcription.")
        }

        let context = AnalysisContext()
        context.contextualStrings[.general] = Array(Set(vocabulary + [
            "psychotherapy", "counselor", "client", "assessment", "intervention",
            "mental status examination", "cognitive behavioral therapy", "diagnosis",
            "medical necessity", "treatment plan", "subjective", "objective"
        ]))

        let analyzer = SpeechAnalyzer(
            modules: [transcriber],
            options: .init(priority: .userInitiated, modelRetention: .whileInUse)
        )
        try await analyzer.setContext(context)
        try await analyzer.prepareToAnalyze(in: audioFormat)

        var streamContinuation: AsyncStream<AnalyzerInput>.Continuation?
        let stream = AsyncStream<AnalyzerInput>(bufferingPolicy: .bufferingNewest(64)) { continuation in
            streamContinuation = continuation
        }
        self.targetFormat = audioFormat
        self.continuation = streamContinuation
        self.analyzer = analyzer

        let sequenceCounter = self.sequenceCounter
        resultTask = Task { [source, binding] in
            do {
                for try await result in transcriber.results {
                    let startSeconds = max(0, CMTimeGetSeconds(result.range.start))
                    let durationSeconds = max(0, CMTimeGetSeconds(result.range.duration))
                    let startMs = Int64((startSeconds * 1_000).rounded())
                    let endMs = Int64(((startSeconds + durationSeconds) * 1_000).rounded())
                    let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { continue }
                    ListenerEventHub.shared.emit(eventPayload(
                        type: "transcript",
                        binding: binding,
                        values: [
                            "source": source,
                            "segmentId": "\(source)-\(startMs)",
                            "text": text,
                            "isFinal": result.isFinal,
                            "startMs": startMs,
                            "endMs": max(startMs, endMs),
                            "sequenceNumber": sequenceCounter.next()
                        ]
                    ))
                }
            } catch {
                ListenerEventHub.shared.emit(eventPayload(
                    type: "warning",
                    binding: binding,
                    values: ["source": source, "message": "\(source.capitalized) transcription stopped: \(error.localizedDescription)"]
                ))
            }
        }

        analysisTask = Task { [binding, source] in
            do {
                try await analyzer.start(inputSequence: stream)
            } catch {
                ListenerEventHub.shared.emit(eventPayload(
                    type: "warning",
                    binding: binding,
                    values: ["source": source, "message": "\(source.capitalized) audio analysis failed: \(error.localizedDescription)"]
                ))
            }
        }
    }

    func setPaused(_ paused: Bool) {
        stateLock.lock()
        self.paused = paused
        stateLock.unlock()
    }

    func accept(_ buffer: AVAudioPCMBuffer) {
        stateLock.lock()
        let shouldDrop = paused || stopped
        stateLock.unlock()
        guard !shouldDrop, let ownedBuffer = copyAudioBuffer(buffer) else { return }

        queue.async { [weak self] in
            self?.convertAndYield(ownedBuffer)
        }
    }

    func acceptOwned(_ buffer: AVAudioPCMBuffer) {
        stateLock.lock()
        let shouldDrop = paused || stopped
        stateLock.unlock()
        guard !shouldDrop else { return }
        queue.async { [weak self] in
            self?.convertAndYield(buffer)
        }
    }

    private func convertAndYield(_ buffer: AVAudioPCMBuffer) {
        stateLock.lock()
        let shouldDrop = paused || stopped
        stateLock.unlock()
        guard !shouldDrop, let targetFormat else { return }

        if converter == nil || converterSourceFormat != buffer.format {
            converter = AVAudioConverter(from: buffer.format, to: targetFormat)
            converterSourceFormat = buffer.format
        }
        guard let converter else { return }

        let ratio = targetFormat.sampleRate / max(buffer.format.sampleRate, 1)
        let capacity = AVAudioFrameCount(max(1, ceil(Double(buffer.frameLength) * ratio) + 32))
        guard let converted = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: capacity) else { return }

        var supplied = false
        var conversionError: NSError?
        let status = converter.convert(to: converted, error: &conversionError) { _, inputStatus in
            if supplied {
                inputStatus.pointee = .noDataNow
                return nil
            }
            supplied = true
            inputStatus.pointee = .haveData
            return buffer
        }
        guard conversionError == nil, status != .error, converted.frameLength > 0 else { return }

        let yieldResult = continuation?.yield(AnalyzerInput(buffer: converted))
        if let yieldResult, case .dropped = yieldResult, Date().timeIntervalSince(lastDropWarning) >= 5 {
            lastDropWarning = Date()
            ListenerEventHub.shared.emit(eventPayload(
                type: "warning",
                binding: binding,
                values: [
                    "source": source,
                    "message": "Listener briefly fell behind on the \(source) stream. Check this portion of the transcript carefully."
                ]
            ))
        }
        emitLevel(for: converted)
    }

    private func emitLevel(for buffer: AVAudioPCMBuffer) {
        let now = Date()
        guard now.timeIntervalSince(lastLevelEvent) >= 0.1 else { return }
        lastLevelEvent = now

        var sum: Float = 0
        var sampleCount = 0
        if let channels = buffer.floatChannelData {
            for channel in 0..<Int(buffer.format.channelCount) {
                let samples = channels[channel]
                for frame in 0..<Int(buffer.frameLength) {
                    let value = samples[frame]
                    sum += value * value
                    sampleCount += 1
                }
            }
        }
        let rms = sampleCount > 0 ? sqrt(sum / Float(sampleCount)) : 0
        let normalized = min(1, max(0, (20 * log10(max(rms, 0.000_001)) + 60) / 60))
        ListenerEventHub.shared.emit(eventPayload(
            type: "level",
            binding: binding,
            values: ["source": source, "level": normalized]
        ))
    }

    func finish() async {
        stateLock.withLock { stopped = true }
        continuation?.finish()
        if let analyzer {
            try? await analyzer.finalizeAndFinishThroughEndOfInput()
        }
        _ = await analysisTask?.result
        _ = await resultTask?.result
        continuation = nil
        converter = nil
        analyzer = nil
    }

    func cancel() async {
        stateLock.withLock { stopped = true }
        continuation?.finish()
        if let analyzer { await analyzer.cancelAndFinishNow() }
        analysisTask?.cancel()
        resultTask?.cancel()
        continuation = nil
        converter = nil
        analyzer = nil
    }
}

@available(macOS 26.0, *)
private final class MicrophoneCapture {
    private static let clientReferenceWait = DispatchTimeInterval.milliseconds(600)

    private let engine = AVAudioEngine()
    private let channel: SpeechChannel
    private let systemAudioGate: SystemAudioActivityGate
    private let deliveryQueue = DispatchQueue(label: "com.smartemr.listener.microphone-gate", qos: .userInitiated)

    init(channel: SpeechChannel, systemAudioGate: SystemAudioActivityGate) {
        self.channel = channel
        self.systemAudioGate = systemAudioGate
    }

    func start() throws -> Bool {
        let input = engine.inputNode
        let voiceProcessingEnabled: Bool
        do {
            try input.setVoiceProcessingEnabled(true)
            input.isVoiceProcessingBypassed = false
            input.isVoiceProcessingAGCEnabled = true
            input.voiceProcessingOtherAudioDuckingConfiguration = .init(
                enableAdvancedDucking: false,
                duckingLevel: .min
            )
            voiceProcessingEnabled = input.isVoiceProcessingEnabled
        } catch {
            voiceProcessingEnabled = false
        }

        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1_024, format: format) { [weak self] buffer, _ in
            self?.accept(buffer)
        }
        engine.prepare()
        try engine.start()
        return voiceProcessingEnabled
    }

    private func accept(_ buffer: AVAudioPCMBuffer) {
        let capturedAt = Date()
        guard let ownedBuffer = copyAudioBuffer(buffer) else { return }
        deliveryQueue.asyncAfter(deadline: .now() + Self.clientReferenceWait) { [weak self] in
            guard let self else { return }
            if self.systemAudioGate.shouldSuppressMicrophone(capturedAt: capturedAt) {
                silenceAudioBuffer(ownedBuffer)
            }
            self.channel.acceptOwned(ownedBuffer)
        }
    }

    func stop() {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
    }
}

@available(macOS 26.0, *)
private final class ProcessTapCapture: @unchecked Sendable {
    private let channel: SpeechChannel
    private let systemAudioGate: SystemAudioActivityGate
    private let queue = DispatchQueue(label: "com.smartemr.listener.process-tap", qos: .userInitiated)
    private var tapId = AudioObjectID(kAudioObjectUnknown)
    private var aggregateDeviceId = AudioObjectID(kAudioObjectUnknown)
    private var ioProcId: AudioDeviceIOProcID?

    init(channel: SpeechChannel, systemAudioGate: SystemAudioActivityGate) {
        self.channel = channel
        self.systemAudioGate = systemAudioGate
    }

    func start(bundleId: String, requestedProcessIds: [UInt32], captureAllSystemAudio: Bool) throws {
        let description: CATapDescription
        if captureAllSystemAudio {
            let appBundleId = Bundle.main.bundleIdentifier ?? "com.clientrecords.tauriapp"
            let ownProcessIds = (try? CoreAudioProcesses.objectIds())?.filter { objectId in
                CoreAudioProcesses.processId(for: objectId) == getpid()
                    || CoreAudioProcesses.bundleId(for: objectId) == appBundleId
            } ?? []
            description = CATapDescription(monoGlobalTapButExcludeProcesses: ownProcessIds)
            description.name = "SmartEMR Listener - System Audio"
            description.bundleIDs = [appBundleId]
            description.isProcessRestoreEnabled = true
        } else {
            let currentIds = CoreAudioProcesses.ids(bundleId: bundleId)
            let requested = requestedProcessIds.map { AudioObjectID($0) }
            let processIds = currentIds.isEmpty ? requested : currentIds
            guard !processIds.isEmpty else {
                throw ListenerNativeError.message("The selected telehealth app is not currently running. Open it, then refresh audio sources.")
            }

            description = CATapDescription(monoMixdownOfProcesses: processIds)
            description.name = "SmartEMR Listener - \(bundleId)"
            description.bundleIDs = [bundleId]
            description.isProcessRestoreEnabled = true
        }
        description.isPrivate = true
        description.muteBehavior = .unmuted
        let tapStatus = AudioHardwareCreateProcessTap(description, &tapId)
        guard tapStatus == noErr else {
            throw ListenerNativeError.message(
                "System audio access was not granted. Enable SmartEMR in System Settings > Privacy & Security > Screen & System Audio Recording, then reopen SmartEMR. (\(statusMessage(tapStatus)))"
            )
        }

        do {
            let tapUid = try readTapUid()
            let format = try readTapFormat()
            let aggregateUid = "com.smartemr.listener.\(UUID().uuidString)"
            let tapEntry: [String: Any] = [
                kAudioSubTapUIDKey: tapUid,
                kAudioSubTapDriftCompensationKey: true
            ]
            let aggregateDescription: [String: Any] = [
                kAudioAggregateDeviceNameKey: "SmartEMR Listener",
                kAudioAggregateDeviceUIDKey: aggregateUid,
                kAudioAggregateDeviceTapListKey: [tapEntry],
                kAudioAggregateDeviceTapAutoStartKey: true,
                kAudioAggregateDeviceIsPrivateKey: true
            ]
            try checkStatus(
                AudioHardwareCreateAggregateDevice(aggregateDescription as CFDictionary, &aggregateDeviceId),
                "Creating the private Listener capture device"
            )

            try checkStatus(
                AudioDeviceCreateIOProcIDWithBlock(&ioProcId, aggregateDeviceId, queue) { [weak self] _, inputData, _, _, _ in
                    guard let self,
                          let copy = copyAudioBufferList(inputData, format: format) else { return }
                    self.systemAudioGate.recordSystemAudio(copy, capturedAt: Date())
                    self.channel.acceptOwned(copy)
                },
                "Connecting the telehealth audio stream"
            )
            try checkStatus(AudioDeviceStart(aggregateDeviceId, ioProcId), "Starting telehealth audio capture")
        } catch {
            stop()
            throw error
        }
    }

    private func readTapUid() throws -> String {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioTapPropertyUID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var value: CFString?
        var size = UInt32(MemoryLayout<CFString?>.size)
        try checkStatus(AudioObjectGetPropertyData(tapId, &address, 0, nil, &size, &value), "Reading the telehealth tap identifier")
        guard let value else { throw ListenerNativeError.message("The telehealth audio tap did not provide an identifier.") }
        return value as String
    }

    private func readTapFormat() throws -> AVAudioFormat {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioTapPropertyFormat,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var streamDescription = AudioStreamBasicDescription()
        var size = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        try checkStatus(
            AudioObjectGetPropertyData(tapId, &address, 0, nil, &size, &streamDescription),
            "Reading the telehealth audio format"
        )
        guard let format = AVAudioFormat(streamDescription: &streamDescription) else {
            throw ListenerNativeError.message("The telehealth app uses an unsupported audio format.")
        }
        return format
    }

    func stop() {
        if aggregateDeviceId != kAudioObjectUnknown, let ioProcId {
            AudioDeviceStop(aggregateDeviceId, ioProcId)
            AudioDeviceDestroyIOProcID(aggregateDeviceId, ioProcId)
        }
        ioProcId = nil
        if aggregateDeviceId != kAudioObjectUnknown {
            AudioHardwareDestroyAggregateDevice(aggregateDeviceId)
            aggregateDeviceId = kAudioObjectUnknown
        }
        if tapId != kAudioObjectUnknown {
            AudioHardwareDestroyProcessTap(tapId)
            tapId = kAudioObjectUnknown
        }
    }

    deinit { stop() }
}

@available(macOS 26.0, *)
@MainActor
private final class ListenerEngine {
    static let shared = ListenerEngine()

    private var binding: ListenerBinding?
    private var micChannel: SpeechChannel?
    private var clientChannel: SpeechChannel?
    private var microphoneCapture: MicrophoneCapture?
    private var processTapCapture: ProcessTapCapture?
    private var activityToken: NSObjectProtocol?
    private var state = "idle"

    func start(_ request: ListenerStartRequest) async {
        guard state == "idle" else {
            emitError("A Listener session is already active.", binding: request.binding)
            return
        }
        binding = request.binding
        state = "preparing"
        activityToken = ProcessInfo.processInfo.beginActivity(
            options: [.userInitiated, .latencyCritical],
            reason: "SmartEMR Listener is transcribing an active clinical session"
        )
        emitState("preparing", "Requesting private, on-device audio access...")

        do {
            guard await requestMicrophonePermission() else {
                throw ListenerNativeError.message("Microphone access was denied. Enable SmartEMR in System Settings > Privacy & Security > Microphone.")
            }
            guard await requestSpeechPermission() else {
                throw ListenerNativeError.message("Speech recognition access was denied. Enable SmartEMR in System Settings > Privacy & Security > Speech Recognition.")
            }

            let locale = request.locale ?? "en_US"
            let vocabulary = request.vocabulary ?? []
            let micChannel = SpeechChannel(source: "counselor", binding: request.binding)
            let clientChannel = SpeechChannel(source: "client", binding: request.binding)
            self.micChannel = micChannel
            self.clientChannel = clientChannel

            try await micChannel.prepare(localeIdentifier: locale, vocabulary: vocabulary)
            try await clientChannel.prepare(localeIdentifier: locale, vocabulary: vocabulary)

            let systemAudioGate = SystemAudioActivityGate()
            let microphoneCapture = MicrophoneCapture(channel: micChannel, systemAudioGate: systemAudioGate)
            let processTapCapture = ProcessTapCapture(channel: clientChannel, systemAudioGate: systemAudioGate)
            do {
                try processTapCapture.start(
                    bundleId: request.telehealthBundleId,
                    requestedProcessIds: request.telehealthProcessIds ?? [],
                    captureAllSystemAudio: request.captureAllSystemAudio ?? false
                )
            } catch {
                throw error
            }
            let voiceProcessingEnabled: Bool
            do {
                voiceProcessingEnabled = try microphoneCapture.start()
            } catch {
                processTapCapture.stop()
                throw error
            }
            self.microphoneCapture = microphoneCapture
            self.processTapCapture = processTapCapture
            state = "listening"
            let isolationMode = voiceProcessingEnabled
                ? "Acoustic echo cancellation and direct-client priority are active."
                : "Direct-client priority isolation is active."
            emitState("listening", "Listening locally. \(isolationMode) Audio is not being recorded to disk.")
        } catch {
            await cleanup(cancel: true)
            emitError(error.localizedDescription, binding: request.binding)
            state = "idle"
            binding = nil
        }
    }

    func pause() {
        guard state == "listening" else { return }
        micChannel?.setPaused(true)
        clientChannel?.setPaused(true)
        state = "paused"
        emitState("paused", "Listener is paused; incoming audio is being discarded.")
    }

    func resume() {
        guard state == "paused" else { return }
        micChannel?.setPaused(false)
        clientChannel?.setPaused(false)
        state = "listening"
        emitState("listening", "Listener resumed.")
    }

    func stop() async {
        guard state != "idle", state != "stopping" else { return }
        let completedBinding = binding
        state = "stopping"
        emitState("stopping", "Finalizing the local transcript...")
        await cleanup(cancel: false)
        state = "idle"
        ListenerEventHub.shared.emit(eventPayload(
            type: "state",
            binding: completedBinding,
            values: ["state": "stopped", "message": "Transcript finalized and ready to generate a note."]
        ))
        binding = nil
    }

    func cancel() async {
        guard state != "idle" else { return }
        let cancelledBinding = binding
        await cleanup(cancel: true)
        state = "idle"
        ListenerEventHub.shared.emit(eventPayload(
            type: "state",
            binding: cancelledBinding,
            values: ["state": "cancelled", "message": "Listener session cancelled."]
        ))
        binding = nil
    }

    private func cleanup(cancel: Bool) async {
        microphoneCapture?.stop()
        processTapCapture?.stop()
        microphoneCapture = nil
        processTapCapture = nil
        if cancel {
            await micChannel?.cancel()
            await clientChannel?.cancel()
        } else {
            await micChannel?.finish()
            await clientChannel?.finish()
        }
        micChannel = nil
        clientChannel = nil
        if let activityToken {
            ProcessInfo.processInfo.endActivity(activityToken)
            self.activityToken = nil
        }
    }

    private func emitState(_ newState: String, _ message: String) {
        ListenerEventHub.shared.emit(eventPayload(
            type: "state",
            binding: binding,
            values: ["state": newState, "message": message]
        ))
    }

    private func emitError(_ message: String, binding: ListenerBinding?) {
        ListenerEventHub.shared.emit(eventPayload(
            type: "error",
            binding: binding,
            values: ["message": message]
        ))
    }

    private func requestMicrophonePermission() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .audio)
        default: return false
        }
    }

    private func requestSpeechPermission() async -> Bool {
        let current = SFSpeechRecognizer.authorizationStatus()
        if current == .authorized { return true }
        if current != .notDetermined { return false }
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }
}

@available(macOS 26.0, *)
private enum LocalDraftGenerator {
    static func generate(_ request: ListenerDraftRequest) async throws -> [String: Any] {
        guard case .available = SystemLanguageModel.default.availability else {
            throw ListenerNativeError.message("Apple Intelligence is not available. Check that it is enabled and the on-device model has finished downloading.")
        }

        let transcriptChunks = chunk(request.transcript, maximumCharacters: 6_000)
        var summaries: [String] = []
        for (index, transcriptChunk) in transcriptChunks.enumerated() {
            let session = LanguageModelSession(instructions: """
                You summarize psychotherapy transcripts for a licensed clinician. Preserve clinically relevant facts,
                symptoms, functional effects, interventions, risk statements, treatment response, plans, and speaker identity.
                Never diagnose, infer, or invent information. Do not include conversational filler.
                """)
            let response = try await session.respond(to: """
                Summarize transcript portion \(index + 1) of \(transcriptChunks.count) in concise clinical bullets.
                Counselor and Client labels are authoritative. If a fact is uncertain, omit it.

                \(transcriptChunk)
                """)
            summaries.append(response.content)
        }

        let context = String((request.clinicalContext ?? "").prefix(3_000))
        let sourceSummary = summaries.joined(separator: "\n\n---\n\n")
        let session = LanguageModelSession(instructions: """
            You create chart-ready psychotherapy documentation using only supplied transcript facts and clinical context.
            Never invent quotations, symptoms, mental status findings, risk findings, interventions, diagnoses, progress, or plans.
            Return one valid JSON object only, without markdown fences or commentary.
            """)
        let response = try await session.respond(to: """
            Create a complete clinical note from the source below. Use concise chart-ready language and speaker-appropriate attribution.
            Every field must be a string except interventions and goalProgress, which are arrays of strings.
            Empty or unsupported fields must be empty strings or empty arrays.

            Required JSON shape:
            {"sessionInfo":"","auditProofing":{"symptoms":"","functionalImpact":"","progressResponse":"","medicalNecessity":""},"soap":{"s":"","o":"","a":"","p":""},"interventions":[],"goalProgress":[],"nextSessionNotes":""}

            Populate auditProofing whenever the source supports it:
            - symptoms: pattern, frequency, duration, intensity, severity, and relevant changes
            - functionalImpact: effects on work, school, relationships, sleep, parenting, self-care, or daily functioning
            - progressResponse: measurable progress, barriers, and response to treatment or interventions
            - medicalNecessity: connect documented symptoms and functional impairment to the need for continued skilled treatment
            Do not fabricate missing audit facts. Leave an unsupported audit field empty rather than making assumptions.

            For interventions, use only exact names from the Known intervention bank in the clinical context and only when the transcript supports them.

            Existing clinical context (reference only; do not claim it occurred today):
            \(context)

            Transcript summaries:
            \(String(sourceSummary.prefix(8_000)))
            """)
        return try parseJSONObject(response.content)
    }

    private static func chunk(_ text: String, maximumCharacters: Int) -> [String] {
        guard text.count > maximumCharacters else { return [text] }
        var chunks: [String] = []
        var current = ""
        for line in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let nextLine = String(line) + "\n"
            if current.count + nextLine.count > maximumCharacters, !current.isEmpty {
                chunks.append(current)
                current = ""
            }
            current += nextLine
        }
        if !current.isEmpty { chunks.append(current) }
        return chunks
    }

    private static func parseJSONObject(_ text: String) throws -> [String: Any] {
        guard let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}"), start <= end else {
            throw ListenerNativeError.message("The on-device model did not return a usable note.")
        }
        let json = String(text[start...end])
        guard let data = json.data(using: .utf8),
              let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw ListenerNativeError.message("The on-device model returned an invalid note. Try generating it again.")
        }
        return object
    }
}

@_cdecl("smartemr_listener_set_event_callback")
public func smartemrListenerSetEventCallback(_ callback: ListenerEventCallback?) {
    ListenerEventHub.shared.setCallback(callback)
}

@_cdecl("smartemr_listener_vad_self_test")
public func smartemrListenerVADSelfTest() -> Int32 {
    adaptiveSpeechDetectorSelfTest() ? 1 : 0
}

@_cdecl("smartemr_listener_audio_gate_self_test")
public func smartemrListenerAudioGateSelfTest() -> Int32 {
    systemSpeechActivityHistorySelfTest() ? 1 : 0
}

@_cdecl("smartemr_listener_capabilities_json")
public func smartemrListenerCapabilitiesJson() -> UnsafeMutablePointer<CChar>? {
    guard #available(macOS 26.0, *) else {
        return jsonCString([
            "supported": false,
            "minimumSystemVersion": "26.0",
            "message": "Listener requires macOS 26 or newer."
        ])
    }

    let modelAvailability: String
    switch SystemLanguageModel.default.availability {
    case .available: modelAvailability = "available"
    case .unavailable(let reason): modelAvailability = "unavailable: \(String(describing: reason))"
    }
    return jsonCString([
        "supported": true,
        "minimumSystemVersion": "26.0",
        "speechAvailable": SpeechTranscriber.isAvailable,
        "foundationModelAvailability": modelAvailability,
        "audioStoredToDisk": false,
        "speakerSeparated": true
    ])
}

@_cdecl("smartemr_listener_sources_json")
public func smartemrListenerSourcesJson() -> UnsafeMutablePointer<CChar>? {
    do {
        let applications = try CoreAudioProcesses.sourceList()
        return jsonCString([
            "applications": applications,
            "microphones": [["id": "system-default", "name": "System Default Microphone"]]
        ])
    } catch {
        return jsonCString(["error": error.localizedDescription, "applications": [], "microphones": []])
    }
}

@_cdecl("smartemr_listener_start")
public func smartemrListenerStart(_ jsonPointer: UnsafePointer<CChar>?) {
    guard #available(macOS 26.0, *), let jsonPointer else { return }
    let json = String(cString: jsonPointer)
    Task { @MainActor in
        do {
            let request = try JSONDecoder().decode(ListenerStartRequest.self, from: Data(json.utf8))
            await ListenerEngine.shared.start(request)
        } catch {
            ListenerEventHub.shared.emit(["type": "error", "message": "Invalid Listener start request: \(error.localizedDescription)"])
        }
    }
}

@_cdecl("smartemr_listener_pause")
public func smartemrListenerPause() {
    guard #available(macOS 26.0, *) else { return }
    Task { @MainActor in ListenerEngine.shared.pause() }
}

@_cdecl("smartemr_listener_resume")
public func smartemrListenerResume() {
    guard #available(macOS 26.0, *) else { return }
    Task { @MainActor in ListenerEngine.shared.resume() }
}

@_cdecl("smartemr_listener_stop")
public func smartemrListenerStop() {
    guard #available(macOS 26.0, *) else { return }
    Task { @MainActor in await ListenerEngine.shared.stop() }
}

@_cdecl("smartemr_listener_cancel")
public func smartemrListenerCancel() {
    guard #available(macOS 26.0, *) else { return }
    Task { @MainActor in await ListenerEngine.shared.cancel() }
}

@_cdecl("smartemr_listener_generate_draft")
public func smartemrListenerGenerateDraft(_ jsonPointer: UnsafePointer<CChar>?) {
    guard #available(macOS 26.0, *), let jsonPointer else { return }
    let json = String(cString: jsonPointer)
    Task {
        do {
            let request = try JSONDecoder().decode(ListenerDraftRequest.self, from: Data(json.utf8))
            ListenerEventHub.shared.emit(eventPayload(
                type: "state",
                binding: request.binding,
                values: ["state": "drafting", "message": "Generating the SOAP note and audit-proofing fields on this Mac..."]
            ))
            let draft = try await LocalDraftGenerator.generate(request)
            ListenerEventHub.shared.emit(eventPayload(
                type: "draft",
                binding: request.binding,
                values: ["draft": draft]
            ))
        } catch {
            let binding = (try? JSONDecoder().decode(ListenerDraftRequest.self, from: Data(json.utf8)))?.binding
            ListenerEventHub.shared.emit(eventPayload(
                type: "error",
                binding: binding,
                values: ["message": "Failed to generate the local note: \(error.localizedDescription)"]
            ))
        }
    }
}

@_cdecl("smartemr_listener_shutdown")
public func smartemrListenerShutdown() {
    guard #available(macOS 26.0, *) else { return }
    Task { @MainActor in await ListenerEngine.shared.cancel() }
}

@_cdecl("smartemr_listener_free_string")
public func smartemrListenerFreeString(_ pointer: UnsafeMutablePointer<CChar>?) {
    free(pointer)
}
