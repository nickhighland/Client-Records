// audio_setup.swift
// Manages CoreAudio aggregate devices for Client Records loopback audio.
//
// Commands:
//   audio_setup status
//   audio_setup setup [--preferred-mic-uid <uid>]
//   audio_setup teardown

import CoreAudio
import Foundation

// MARK: - Constants

let kAggInputUID  = "com.clientrecords.audio.aggregate.input"
let kAggOutputUID = "com.clientrecords.audio.aggregate.output"
let kAggInputName  = "Client Records Input"
let kAggOutputName = "Client Records Output"

let stateFilePath = URL(fileURLWithPath: NSHomeDirectory())
    .appendingPathComponent(".clientrecords-audio-state.json")

// MARK: - State

struct SavedState: Codable {
    var originalOutputDeviceID: UInt32
}

func loadState() -> SavedState? {
    guard let data = try? Data(contentsOf: stateFilePath) else { return nil }
    return try? JSONDecoder().decode(SavedState.self, from: data)
}

func saveState(_ s: SavedState) {
    if let data = try? JSONEncoder().encode(s) { try? data.write(to: stateFilePath) }
}

func deleteState() { try? FileManager.default.removeItem(at: stateFilePath) }

// MARK: - CoreAudio helpers

func getAllDevices() -> [AudioDeviceID] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size) == noErr,
          size > 0 else { return [] }
    let count = Int(size) / MemoryLayout<AudioDeviceID>.size
    var devices = [AudioDeviceID](repeating: 0, count: count)
    AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &devices)
    return devices
}

func getDeviceUID(_ id: AudioDeviceID) -> String? {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceUID,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var uid: CFString = "" as CFString
    var size = UInt32(MemoryLayout<CFString>.size)
    guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &uid) == noErr else { return nil }
    return uid as String
}

func getDeviceName(_ id: AudioDeviceID) -> String? {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceNameCFString,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var name: CFString = "" as CFString
    var size = UInt32(MemoryLayout<CFString>.size)
    guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &name) == noErr else { return nil }
    return name as String
}

func deviceHasInputChannels(_ id: AudioDeviceID) -> Bool {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreamConfiguration,
        mScope: kAudioDevicePropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(id, &addr, 0, nil, &size) == noErr, size > 0 else { return false }
    let raw = UnsafeMutableRawPointer.allocate(byteCount: Int(size),
                                               alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { raw.deallocate() }
    guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, raw) == noErr else { return false }
    return raw.bindMemory(to: AudioBufferList.self, capacity: 1).pointee.mNumberBuffers > 0
}

func getDefaultInput() -> AudioDeviceID? {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var id: AudioDeviceID = kAudioObjectUnknown
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id) == noErr,
          id != kAudioObjectUnknown else { return nil }
    return id
}

func getDefaultOutput() -> AudioDeviceID? {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var id: AudioDeviceID = kAudioObjectUnknown
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id) == noErr,
          id != kAudioObjectUnknown else { return nil }
    return id
}

func setDefaultOutput(_ id: AudioDeviceID) -> Bool {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var devID = id
    return AudioObjectSetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil,
                                       UInt32(MemoryLayout<AudioDeviceID>.size), &devID) == noErr
}

func getHALPlugin() -> AudioObjectID {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyPlugInForBundleID,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var pluginID: AudioObjectID = kAudioObjectUnknown
    var bundleID: CFString = "com.apple.audio.CoreAudio" as CFString
    var size = UInt32(MemoryLayout<AudioValueTranslation>.size)

    withUnsafeMutablePointer(to: &bundleID) { bundleIDPtr in
        withUnsafeMutablePointer(to: &pluginID) { pluginIDPtr in
            var translation = AudioValueTranslation(
                mInputData: UnsafeMutableRawPointer(bundleIDPtr),
                mInputDataSize: UInt32(MemoryLayout<CFString>.size),
                mOutputData: UnsafeMutableRawPointer(pluginIDPtr),
                mOutputDataSize: UInt32(MemoryLayout<AudioObjectID>.size)
            )
            _ = AudioObjectGetPropertyData(
                AudioObjectID(kAudioObjectSystemObject),
                &addr,
                0,
                nil,
                &size,
                &translation
            )
        }
    }
    return pluginID
}

func findDeviceByUID(_ uid: String) -> AudioDeviceID? {
    getAllDevices().first { getDeviceUID($0) == uid }
}

func findBlackHole() -> AudioDeviceID? {
    getAllDevices().first { (getDeviceName($0) ?? "").lowercased().contains("blackhole") }
}

func createAggregate(name: String, uid: String, subUIDs: [String], masterUID: String) -> AudioDeviceID? {
    let pluginID = getHALPlugin()
    guard pluginID != kAudioObjectUnknown else {
        fputs("getHALPlugin failed\n", stderr); return nil
    }

    let desc: [String: Any] = [
        kAudioAggregateDeviceNameKey as String:            name,
        kAudioAggregateDeviceUIDKey as String:             uid,
        kAudioAggregateDeviceIsPrivateKey as String:       NSNumber(value: 0),
        kAudioAggregateDeviceIsStackedKey as String:       NSNumber(value: 0)
    ]

    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioPlugInCreateAggregateDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)

    var aggregateDesc = desc as CFDictionary
    var deviceID: AudioDeviceID = kAudioObjectUnknown
    var outSize = UInt32(MemoryLayout<AudioDeviceID>.size)
    let status = AudioObjectGetPropertyData(pluginID, &addr,
                                             UInt32(MemoryLayout<CFDictionary>.size), &aggregateDesc,
                                             &outSize, &deviceID)
    guard status == noErr, deviceID != kAudioObjectUnknown else {
        fputs("createAggregate '\(name)' failed: \(status)\n", stderr); return nil
    }

    var subDevicesAddr = AudioObjectPropertyAddress(
        mSelector: kAudioAggregateDevicePropertyFullSubDeviceList,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var subDevices = subUIDs as CFArray
    let setSubDevicesStatus = AudioObjectSetPropertyData(
        deviceID,
        &subDevicesAddr,
        0,
        nil,
        UInt32(MemoryLayout<CFArray>.size),
        &subDevices
    )
    guard setSubDevicesStatus == noErr else {
        fputs("setSubDevices '\(name)' failed: \(setSubDevicesStatus)\n", stderr)
        return nil
    }

    var masterAddr = AudioObjectPropertyAddress(
        mSelector: kAudioAggregateDevicePropertyMainSubDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var masterUIDCF = masterUID as CFString
    let setMasterStatus = AudioObjectSetPropertyData(
        deviceID,
        &masterAddr,
        0,
        nil,
        UInt32(MemoryLayout<CFString>.size),
        &masterUIDCF
    )
    guard setMasterStatus == noErr else {
        fputs("setMaster '\(name)' failed: \(setMasterStatus)\n", stderr)
        return nil
    }

    return deviceID
}

func destroyAggregate(_ id: AudioDeviceID) {
    let pluginID = getHALPlugin()
    guard pluginID != kAudioObjectUnknown else { return }
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioPlugInDestroyAggregateDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain)
    var devID = id
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    _ = AudioObjectGetPropertyData(pluginID, &addr, 0, nil, &size, &devID)
}

// MARK: - JSON output

func printJSON(_ obj: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: obj),
       let str = String(data: data, encoding: .utf8) { print(str) }
}

// MARK: - Commands

func cmdStatus() {
    let bh = findBlackHole()
    printJSON([
        "blackholeInstalled":   bh != nil,
        "blackholeName":        bh.flatMap { getDeviceName($0) } ?? "",
        "aggregateInputExists":  findDeviceByUID(kAggInputUID) != nil,
        "aggregateOutputExists": findDeviceByUID(kAggOutputUID) != nil,
        "aggregateInputUID":     kAggInputUID,
        "aggregateOutputUID":    kAggOutputUID
    ])
}

func cmdSetup(preferredMicUID: String?) {
    // Require BlackHole
    guard let bh = findBlackHole(), let bhUID = getDeviceUID(bh) else {
        printJSON(["success": false,
                   "error": "BlackHole audio device not found. Install BlackHole 2ch first."])
        exit(1)
    }

    // Resolve mic UID
    var micUID: String? = preferredMicUID
    if let uid = micUID, findDeviceByUID(uid) == nil { micUID = nil }
    if micUID == nil || micUID == bhUID {
        let defIn = getDefaultInput()
        micUID = defIn.flatMap { getDeviceUID($0) }
        if micUID == bhUID {
            micUID = getAllDevices()
                .filter { getDeviceUID($0) != bhUID && deviceHasInputChannels($0) }
                .first.flatMap { getDeviceUID($0) }
        }
    }
    guard let micUID = micUID else {
        printJSON(["success": false, "error": "No microphone input device found."])
        exit(1)
    }

    // Save current output
    guard let currentOut = getDefaultOutput(), let currentOutUID = getDeviceUID(currentOut) else {
        printJSON(["success": false, "error": "Could not determine current output device."])
        exit(1)
    }

    // Tear down any existing aggregate devices from a previous setup
    if let existing = findDeviceByUID(kAggInputUID)  { destroyAggregate(existing) }
    if let existing = findDeviceByUID(kAggOutputUID) { destroyAggregate(existing) }
    Thread.sleep(forTimeInterval: 0.4)

    // Aggregate INPUT: mic (ch 0) + BlackHole (ch 1)
    guard let _ = createAggregate(name: kAggInputName, uid: kAggInputUID,
                                   subUIDs: [micUID, bhUID], masterUID: micUID) else {
        printJSON(["success": false, "error": "Failed to create aggregate input device."])
        exit(1)
    }
    Thread.sleep(forTimeInterval: 0.4)

    // Aggregate OUTPUT: current speakers + BlackHole (mirrors system audio to BlackHole)
    var outputSwitched = false
    if currentOutUID != bhUID {
        if let _ = createAggregate(name: kAggOutputName, uid: kAggOutputUID,
                                    subUIDs: [currentOutUID, bhUID], masterUID: currentOutUID) {
            Thread.sleep(forTimeInterval: 0.4)
            if let aggOut = findDeviceByUID(kAggOutputUID) {
                outputSwitched = setDefaultOutput(aggOut)
            }
        }
        // Non-fatal if output aggregate fails
    }

    saveState(SavedState(originalOutputDeviceID: currentOut))

    let micName = findDeviceByUID(micUID).flatMap { getDeviceName($0) } ?? micUID
    printJSON([
        "success":            true,
        "aggregateInputUID":  kAggInputUID,
        "aggregateOutputUID": kAggOutputUID,
        "outputSwitched":     outputSwitched,
        "micName":            micName,
        "blackholeName":      getDeviceName(bh) ?? bhUID
    ])
}

func cmdTeardown() {
    if let existing = findDeviceByUID(kAggOutputUID) { destroyAggregate(existing) }
    if let existing = findDeviceByUID(kAggInputUID)  { destroyAggregate(existing) }
    Thread.sleep(forTimeInterval: 0.4)

    if let state = loadState() {
        let origID = AudioDeviceID(state.originalOutputDeviceID)
        if origID != kAudioObjectUnknown { _ = setDefaultOutput(origID) }
    }
    deleteState()
    printJSON(["success": true])
}

// MARK: - Entry point

let args = CommandLine.arguments
guard args.count >= 2 else {
    fputs("Usage: audio_setup <status|setup|teardown> [--preferred-mic-uid <uid>]\n", stderr)
    exit(1)
}

switch args[1] {
case "status":
    cmdStatus()

case "setup":
    var micUID: String? = nil
    var i = 2
    while i < args.count {
        if args[i] == "--preferred-mic-uid", i + 1 < args.count {
            micUID = args[i + 1]; i += 2
        } else { i += 1 }
    }
    cmdSetup(preferredMicUID: micUID)

case "teardown":
    cmdTeardown()

default:
    fputs("Unknown command: \(args[1])\n", stderr)
    exit(1)
}
