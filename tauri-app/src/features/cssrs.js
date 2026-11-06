    document.addEventListener('DOMContentLoaded', function() {
        // --- CSSRS Modal Logic ---
        const ids = ["cssrs_q1","cssrs_q2","cssrs_q3","cssrs_q4","cssrs_q5","cssrs_q6","cssrs_q6_3mo"];
        const el = (id) => document.getElementById(id);
        function valOrBlank(v){ return (v && v.trim()) ? v.trim() : ""; }
        function setDisabled(id, disabled){
            const node = el(id);
            if (!node) return;
            node.disabled = disabled;
            if (disabled) node.value = "";
        }
        function applySkipLogic(){
            const a2 = valOrBlank(el("cssrs_q2").value);
            const skip = (a2 === "NO");
            setDisabled("cssrs_q3", skip);
            setDisabled("cssrs_q4", skip);
            setDisabled("cssrs_q5", skip);
            const a6 = valOrBlank(el("cssrs_q6").value);
            const skip6m = (a6 !== "YES");
            setDisabled("cssrs_q6_3mo", skip6m);
            el("cssrs_q6_3mo").classList.toggle("hidden", skip6m);
            el("cssrs_q6_3mo_na").classList.toggle("hidden", !skip6m);
        }
        function deriveRisk(){
            const a1 = valOrBlank(el("cssrs_q1").value);
            const a2 = valOrBlank(el("cssrs_q2").value);
            const a3 = valOrBlank(el("cssrs_q3").value);
            const a4 = valOrBlank(el("cssrs_q4").value);
            const a5 = valOrBlank(el("cssrs_q5").value);
            const a6 = valOrBlank(el("cssrs_q6").value);
            const a6m = valOrBlank(el("cssrs_q6_3mo").value);
            let high = false, moderate = false, low = false;
            if (a3 === "YES") moderate = true;
            else if (a3 === "NO") low = true;
            if (a4 === "YES" || a5 === "YES"){
                high = true; moderate = false; low = false;
            }
            if (a6 === "YES"){
                if (a6m === "YES"){ high = true; moderate = false; low = false; }
                else if (!high){ moderate = true; low = false; }
            }
            if (!high && !moderate){ low = true; }
            if (high) return { level: "High", cls: "high", note: "Positive intent/plan and/or recent behavior." };
            if (moderate) return { level: "Moderate", cls: "mod", note: "Ideation present without intent/plan or behavior." };
            if (low) return { level: "Low", cls: "low", note: "No intent/plan or behavior endorsed." };
            return { level: "Not set", cls: "", note: "" };
        }
        function updateRiskUI(){
            const risk = deriveRisk();
            const pill = el("cssrs_riskPill");
            const note = el("cssrs_riskNote");
            pill.textContent = risk.level;
            pill.className = "risk-pill" + (risk.cls ? " " + risk.cls : "");
            note.textContent = risk.note;
        }
        function isComplete(){
            const a1 = valOrBlank(el("cssrs_q1").value);
            const a2 = valOrBlank(el("cssrs_q2").value);
            const a3 = valOrBlank(el("cssrs_q3").value);
            const a4 = valOrBlank(el("cssrs_q4").value);
            const a5 = valOrBlank(el("cssrs_q5").value);
            const a6 = valOrBlank(el("cssrs_q6").value);
            const a6m = valOrBlank(el("cssrs_q6_3mo").value);
            if (!a1 || !a2 || !a6) return false;
            if (a2 === "YES" && (!a3 || !a4 || !a5)) return false;
            if (a6 === "YES" && !a6m) return false;
            if (a6 === "NO") return true;
            return true;
        }
        function buildCompiled(){
            if (!isComplete()){
                el("cssrs_compiled").value = "Complete all required fields to generate clinical note.";
                return;
            }
            const a1 = valOrBlank(el("cssrs_q1").value);
            const a2 = valOrBlank(el("cssrs_q2").value);
            const a3 = valOrBlank(el("cssrs_q3").value);
            const a4 = valOrBlank(el("cssrs_q4").value);
            const a5 = valOrBlank(el("cssrs_q5").value);
            const a6 = valOrBlank(el("cssrs_q6").value);
            const a6m = valOrBlank(el("cssrs_q6_3mo").value);
            const risk = deriveRisk();
            const lines = [];
            lines.push("CSSRS (Past Month) - Responses");
            lines.push("1) Have you wished you were dead or wished you could go to sleep and not wake up? Answer: " + (a1 || ""));
            lines.push("2) Have you actually had any thoughts about killing yourself? Answer: " + (a2 || ""));
            if (a2 === "YES"){
                lines.push("3) Have you been thinking about how you might do this? Answer: " + (a3 || ""));
                lines.push("4) Have you had these thoughts and had some intention of acting on them? Answer: " + (a4 || ""));
                lines.push("5) Have you started to work out or worked out the details of how to kill yourself? Did you intend to carry out this plan? Answer: " + (a5 || ""));
            }
            lines.push("6) Have you done anything, started to do anything, or prepared to do anything to end your life? Answer: " + (a6 || ""));
            if (a6 === "YES"){
                lines.push("   If yes, was this within the past 3 months? Answer: " + (a6m || ""));
            } else {
                lines.push("   If yes, was this within the past 3 months? Answer: N/A");
            }
            lines.push("");
            lines.push("Risk level: " + risk.level);
            if (risk.note) lines.push("Risk note: " + risk.note);
            el("cssrs_compiled").value = lines.join("\n");
        }
        async function copyCompiled(){
            const text = el("cssrs_compiled").value;
            if (!text.trim()){
                el("cssrs_status").textContent = "Nothing to copy.";
                return;
            }
            try{
                await navigator.clipboard.writeText(text);
                el("cssrs_status").textContent = "Copied.";
            }catch(e){
                el("cssrs_compiled").focus();
                el("cssrs_compiled").select();
                el("cssrs_status").textContent = "Clipboard blocked. Selected text instead (press Ctrl/Cmd+C).";
            }
        }
        function clearAll(){
            ids.forEach(id => el(id).value = "");
            el("cssrs_status").textContent = "";
            applySkipLogic();
            updateRiskUI();
            buildCompiled();
        }
        ids.forEach(id => {
            const node = el(id);
            if (!node) return;
            node.addEventListener("change", () => {
                applySkipLogic();
                updateRiskUI();
                buildCompiled();
            });
        });
        if (el("cssrs_copyBtn")) el("cssrs_copyBtn").addEventListener("click", copyCompiled);
        if (el("cssrs_clearBtn")) el("cssrs_clearBtn").addEventListener("click", clearAll);
        // Modal open/close logic
        const modal = document.getElementById("cssrsModal");
        const openBtn = document.getElementById("cssrsBtn");
        const closeBtn = document.getElementById("closeCssrsBtn");
        if (openBtn) {
            openBtn.addEventListener("click", ()=>{ modal.classList.remove("hidden"); modal.focus(); });
        } else {
            // If the button is not present at DOMContentLoaded, try again after a short delay (for dynamic UIs)
            setTimeout(() => {
                const retryBtn = document.getElementById("cssrsBtn");
                if (retryBtn) retryBtn.addEventListener("click", ()=>{ modal.classList.remove("hidden"); modal.focus(); });
            }, 1000);
        }
        if (closeBtn) closeBtn.addEventListener("click", ()=>{ modal.classList.add("hidden"); });
        // ESC to close
        document.addEventListener("keydown", (e)=>{
            if (!modal.classList.contains("hidden") && (e.key === "Escape")) modal.classList.add("hidden");
        });
        // Initialize
        applySkipLogic();
        updateRiskUI();
        buildCompiled();

        // Robustly attach CSSRS button event after every render
        function attachCssrsBtnHandler() {
            const modal = document.getElementById("cssrsModal");
            const openBtn = document.getElementById("cssrsBtn");
            if (openBtn && modal) {
                // Remove any previous handler to avoid duplicates
                openBtn.removeEventListener("click", openBtn._cssrsHandler);
                openBtn._cssrsHandler = () => { modal.classList.remove("hidden"); modal.focus(); };
                openBtn.addEventListener("click", openBtn._cssrsHandler);
            }
        }
        // Attach once on DOMContentLoaded
        attachCssrsBtnHandler();
        // Patch the global fullRender (if present) to always re-attach after UI updates
        if (typeof window.fullRender === 'function') {
            const origFullRender = window.fullRender;
            window.fullRender = function(...args) {
                const result = origFullRender.apply(this, args);
                attachCssrsBtnHandler();
                return result;
            };
        }
    });
