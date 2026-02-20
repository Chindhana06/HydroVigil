import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./components/Header";
import KPICard from "./components/KPICard";
import LiveCharts from "./components/LiveCharts";
import IncidentLog from "./components/IncidentLog";
import AIExplanation from "./components/AIExplanation";
import NetworkMap from "./components/NetworkMap";

const MAX_POINTS = 36;
const TICK_INTERVAL_MS = 1000;
const PHASE_1_MS = 2000;
const PHASE_2_MS = 3600;

const PHASE = {
  NORMAL: "normal",
  PHASE_1: "phase1",
  PHASE_2: "phase2",
  PHASE_3: "phase3",
};
const ATTACK_SENSOR_IDS = ["P-11", "P-17", "P-23", "W-05", "GW-A2"];
const FEED_INTERVAL_BY_PHASE_MS = {
  normal: 15000,
  phase1: 9000,
  phase2: 6500,
  phase3: 8000,
};
const BACKGROUND_INCIDENTS = {
  normal: [
    { event: "Routine telemetry checksum verified", severity: "low", status: "Cleared" },
    { event: "Command audit completed with no drift", severity: "low", status: "Cleared" },
    { event: "Edge gateway heartbeat latency normalized", severity: "low", status: "Monitoring" },
    { event: "Operator authentication profile matched", severity: "low", status: "Cleared" },
  ],
  phase1: [
    { event: "Low-amplitude pressure variance flagged", severity: "medium", status: "Monitoring" },
    { event: "Flow baseline deviation exceeded guardband", severity: "medium", status: "Investigating" },
    { event: "Telemetry correlation confidence reduced", severity: "medium", status: "Monitoring" },
  ],
  phase2: [
    { event: "Write-command burst detected on control segment", severity: "critical", status: "Investigating" },
    { event: "Sustained hydraulic mismatch across paired sensors", severity: "critical", status: "Escalated" },
    { event: "Safety threshold override attempt intercepted", severity: "critical", status: "Investigating" },
    { event: "Anomalous actuator response pattern confirmed", severity: "critical", status: "Escalated" },
  ],
  phase3: [
    { event: "Containment policy lock remains active", severity: "medium", status: "Monitoring" },
    { event: "Forensic capture pipeline synchronized", severity: "medium", status: "Investigating" },
    { event: "Residual anomaly dampening in progress", severity: "medium", status: "Monitoring" },
  ],
};

function randomVariance(scale) {
  return (Math.random() - 0.5) * scale;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function pickRandomAttackSensor(previousSensorId) {
  const candidates = ATTACK_SENSOR_IDS.filter((id) => id !== previousSensorId);
  const pool = candidates.length > 0 ? candidates : ATTACK_SENSOR_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildBackgroundIncident(phase, targetSensorId) {
  const template = pickRandomItem(BACKGROUND_INCIDENTS[phase] ?? BACKGROUND_INCIDENTS.normal);
  const pool = ATTACK_SENSOR_IDS.filter(Boolean);
  const sensorId =
    phase !== PHASE.NORMAL && Math.random() < 0.35 ? targetSensorId : pickRandomItem(pool);
  return { ...template, sensorId };
}

function buildDataPoint(index, phase) {
  const driftCycle = ((index % 12) / 11) * 7.5;
  const now = new Date();

  let pressure = 58 + Math.sin(index / 2.4) * 1.8 + randomVariance(1.2);
  let flow = 132 + Math.cos(index / 3.1) * 2.1 + randomVariance(1.6);
  let level = 78 + Math.sin(index / 3.6) * 1.2 + randomVariance(0.9);
  let anomalyLevel = 0;

  if (phase === PHASE.PHASE_1) {
    pressure = 57 + Math.sin(index * 1.1) * 3.8 + randomVariance(1.8);
    flow = 134 + driftCycle + randomVariance(1.7);
    level = 77 + Math.sin(index * 0.9) * 1.8 + randomVariance(1.2);
    anomalyLevel = 0.35;
  }

  if (phase === PHASE.PHASE_2) {
    pressure = 69 + Math.sin(index * 1.6) * 13 + (index % 4 === 0 ? 10 : 0) + randomVariance(2.8);
    flow = 166 + Math.cos(index * 1.05) * 10 + randomVariance(3.8);
    level = 71 + Math.sin(index * 2.1) * 8.5 + randomVariance(3.1);
    anomalyLevel = 0.92;
  }

  if (phase === PHASE.PHASE_3) {
    pressure = 64 + Math.sin(index * 1.15) * 7.2 + randomVariance(2.3);
    flow = 154 + Math.cos(index * 1.2) * 6.2 + randomVariance(2.6);
    level = 74 + Math.sin(index * 1.6) * 5.6 + randomVariance(2.1);
    anomalyLevel = 0.66;
  }

  return {
    id: index,
    time: formatTime(now),
    pressure,
    flow,
    level,
    anomalyLevel,
  };
}

function seedData() {
  return Array.from({ length: MAX_POINTS }, (_, index) => buildDataPoint(index, PHASE.NORMAL));
}

const ICONS = {
  nodes: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM9 14h6v6H9z" />
      <path d="M10 7h4M7 10v4M17 10v4M10 17h4" />
    </svg>
  ),
  sensors: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4a8 8 0 0 1 8 8" />
      <path d="M12 8a4 4 0 0 1 4 4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M4 20h16" />
    </svg>
  ),
  threat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 4v6c0 5.2-3.6 8.8-8 10-4.4-1.2-8-4.8-8-10V7z" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  ),
  anomaly: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  ),
  response: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  ),
  confidence: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 15l4-4 3 3 5-6 4 4" />
      <path d="M4 20h16" />
    </svg>
  ),
};

function playSubtleBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) return;
    const ctx = new AudioContextRef();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.14);
    oscillator.onended = () => {
      ctx.close();
    };
  } catch {
    // Audio is optional for this simulation mode.
  }
}

export default function App() {
  const [timestamp, setTimestamp] = useState(new Date());
  const [data, setData] = useState(seedData);
  const [simulationPhase, setSimulationPhase] = useState(PHASE.NORMAL);
  const [attackTargetId, setAttackTargetId] = useState("P-23");
  const [toast, setToast] = useState(null);
  const [incidents, setIncidents] = useState([
    {
      id: 1,
      timestamp: "08:42:15",
      sensorId: "P-11",
      event: "Baseline packet profile restored",
      severity: "low",
      status: "Cleared",
    },
    {
      id: 2,
      timestamp: "08:39:01",
      sensorId: "P-19",
      event: "Unauthorized Modbus command rejected",
      severity: "medium",
      status: "Contained",
    },
    {
      id: 3,
      timestamp: "08:34:42",
      sensorId: "W-05",
      event: "Telemetry drift above threshold",
      severity: "medium",
      status: "Monitoring",
    },
    {
      id: 4,
      timestamp: "08:30:05",
      sensorId: "GW-A2",
      event: "Credential replay attempt blocked",
      severity: "low",
      status: "Cleared",
    },
  ]);

  const phaseTimersRef = useRef([]);
  const toastTimeoutRef = useRef(null);
  const incidentIdRef = useRef(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date());
      setData((current) => {
        const next = [...current, buildDataPoint(current[current.length - 1].id + 1, simulationPhase)];
        return next.slice(-MAX_POINTS);
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [simulationPhase]);

  useEffect(() => {
    return () => {
      phaseTimersRef.current.forEach((id) => clearTimeout(id));
      clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const cadence = FEED_INTERVAL_BY_PHASE_MS[simulationPhase] ?? FEED_INTERVAL_BY_PHASE_MS.normal;
    const timer = setInterval(() => {
      const backgroundIncident = buildBackgroundIncident(simulationPhase, attackTargetId);
      incidentIdRef.current += 1;
      setIncidents((current) => [
        {
          id: incidentIdRef.current,
          timestamp: formatTime(new Date()),
          ...backgroundIncident,
        },
        ...current,
      ].slice(0, 12));
    }, cadence);

    return () => clearInterval(timer);
  }, [simulationPhase, attackTargetId]);

  const pushIncident = (incident) => {
    setIncidents((current) => [incident, ...current].slice(0, 12));
  };

  const nextIncidentId = () => {
    incidentIdRef.current += 1;
    return incidentIdRef.current;
  };

  const schedulePhase = (delay, callback) => {
    const timer = setTimeout(callback, delay);
    phaseTimersRef.current.push(timer);
  };

  const clearSimulationTimers = () => {
    phaseTimersRef.current.forEach((id) => clearTimeout(id));
    phaseTimersRef.current = [];
  };

  const setTimedToast = (payload, ttl = 4600) => {
    setToast(payload);
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), ttl);
  };

  const triggerCoordinatedAttack = () => {
    if (simulationPhase !== PHASE.NORMAL) return;
    const selectedTargetId = pickRandomAttackSensor(attackTargetId);
    clearSimulationTimers();
    setAttackTargetId(selectedTargetId);
    setSimulationPhase(PHASE.PHASE_1);

    schedulePhase(PHASE_1_MS, () => {
      setSimulationPhase(PHASE.PHASE_2);
      playSubtleBeep();
      setTimedToast({
        id: Date.now(),
        title: `Critical anomaly detected in Sensor ${selectedTargetId}`,
        message: "Flow-pressure correlation breach has crossed critical thresholds.",
      });
    });

    schedulePhase(PHASE_1_MS + PHASE_2_MS, () => {
      const now = formatTime(new Date());
      setSimulationPhase(PHASE.PHASE_3);
      pushIncident({
        id: nextIncidentId(),
        timestamp: now,
        sensorId: selectedTargetId,
        event: "Coordinated flow-pressure manipulation signature detected",
        severity: "critical",
        status: "Investigating",
      });
    });
  };

  const resetSystem = () => {
    clearSimulationTimers();
    setSimulationPhase(PHASE.NORMAL);
    setToast(null);
    pushIncident({
      id: nextIncidentId(),
      timestamp: formatTime(new Date()),
      sensorId: "SOC-AUTO",
      event: "Threat contained. System stabilized.",
      severity: "medium",
      status: "Cleared",
    });
  };

  const anomalyCount = useMemo(
    () => data.slice(-10).filter((point) => point.anomalyLevel >= 0.6).length,
    [data]
  );

  const phaseScore = {
    [PHASE.NORMAL]: { nodes: 128, sensors: 412, threat: 24, response: 2.7, confidence: 82 },
    [PHASE.PHASE_1]: { nodes: 127, sensors: 406, threat: 55, response: 4.6, confidence: 68 },
    [PHASE.PHASE_2]: { nodes: 123, sensors: 391, threat: 91, response: 8.2, confidence: 86 },
    [PHASE.PHASE_3]: { nodes: 124, sensors: 394, threat: 94, response: 7.1, confidence: 94 },
  }[simulationPhase];

  const systemStatus = useMemo(() => {
    if (simulationPhase === PHASE.PHASE_1) return "suspicious";
    if (simulationPhase === PHASE.PHASE_2 || simulationPhase === PHASE.PHASE_3) return "active_attack";
    return "normal";
  }, [simulationPhase]);

  const aiBriefing = useMemo(() => {
    if (simulationPhase === PHASE.PHASE_1) {
      return {
        headline: "Irregular signal variance detected.",
        summary:
          "Early-stage divergence has emerged in pressure and flow correlation. Behavioral model confidence indicates suspicious but not yet conclusive cyber-physical interference.",
        confidence: 68,
        threatLevel: "Guarded",
        signals: [
          "Pressure oscillation exceeds micro-variance tolerance",
          "Flow rate trending outside normal baseline envelope",
          "No maintenance operation scheduled for affected segment",
        ],
        recommendations: [
          `Increase polling frequency for Sensor ${attackTargetId}`,
          "Enable command-origin tracing for valve cluster",
          "Prepare containment playbook escalation",
        ],
        expanded: false,
      };
    }

    if (simulationPhase === PHASE.PHASE_2) {
      return {
        headline: "Attack escalation detected across telemetry stream.",
        summary:
          "Pressure spikes and sustained flow increase now align with hostile manipulation indicators. Water-level stability is degrading beyond safe operational guardrails.",
        confidence: 86,
        threatLevel: "Guarded",
        signals: [
          "Sharp pressure spikes beyond operational envelope",
          "Flow rate sustained above safety threshold",
          "Cross-sensor divergence in reservoir level trend",
        ],
        recommendations: [
          "Lock remote writes for distribution controllers",
          "Segment suspicious field gateway traffic",
          "Dispatch rapid diagnostic verification",
        ],
        expanded: false,
      };
    }

    if (simulationPhase === PHASE.PHASE_3) {
      return {
        headline: "AI Response and Containment Briefing",
        summary:
          "Detected coordinated manipulation of flow-pressure correlation. Probability of malicious intrusion: 94%.",
        confidence: 94,
        threatLevel: "High",
        signals: [
          `Coordinated command burst pattern on Sensor ${attackTargetId} path`,
          "Pressure-flow coupling broken by non-physical command rhythm",
          "Anomaly persistence despite baseline damping controls",
        ],
        recommendations: [
          "Maintain controller lockout until forensic validation completes",
          "Rotate edge device credentials and close exposed sessions",
          "Continue containment telemetry audit for 15-minute window",
        ],
        expanded: true,
      };
    }

    return {
      headline: "System operating within expected cyber-physical baseline.",
      summary:
        "Sensor streams and command telemetry remain aligned with historical behavior. No active intrusion chain detected.",
      confidence: 82,
      threatLevel: "Low",
      signals: [
        "Pressure and flow variance remain inside tolerance bands",
        "No unauthorized command writes observed",
        "Authentication profile matches operator schedule",
      ],
      recommendations: [
        "Maintain segmented network policy enforcement",
        "Continue adaptive anomaly threshold calibration",
        "Run next integrity scan during low-demand window",
      ],
      expanded: false,
    };
  }, [simulationPhase, attackTargetId]);

  const severityByPhase = {
    [PHASE.NORMAL]: "stable",
    [PHASE.PHASE_1]: "warning",
    [PHASE.PHASE_2]: "critical",
    [PHASE.PHASE_3]: "critical",
  }[simulationPhase];

  const kpiCards = [
    {
      title: "Network Nodes Online",
      value: phaseScore.nodes,
      unit: "",
      decimals: 0,
      delta: simulationPhase === PHASE.NORMAL ? -0.3 : simulationPhase === PHASE.PHASE_1 ? 1.2 : 3.9,
      severity: severityByPhase,
      icon: ICONS.nodes,
    },
    {
      title: "Active Sensors",
      value: phaseScore.sensors,
      unit: "",
      decimals: 0,
      delta: simulationPhase === PHASE.NORMAL ? 0.4 : simulationPhase === PHASE.PHASE_1 ? -2.1 : -4.7,
      severity: severityByPhase,
      icon: ICONS.sensors,
    },
    {
      title: "Threat Score",
      value: phaseScore.threat,
      unit: "/100",
      decimals: 0,
      delta: simulationPhase === PHASE.NORMAL ? -1.4 : simulationPhase === PHASE.PHASE_1 ? 18.9 : 31.6,
      severity: severityByPhase,
      icon: ICONS.threat,
    },
    {
      title: "Anomalies (10 ticks)",
      value: anomalyCount,
      unit: "",
      decimals: 0,
      delta: simulationPhase === PHASE.NORMAL ? -0.7 : simulationPhase === PHASE.PHASE_1 ? 6.1 : 15.4,
      severity: severityByPhase,
      icon: ICONS.anomaly,
    },
    {
      title: "Mean Response Time",
      value: phaseScore.response,
      unit: "s",
      decimals: 1,
      delta: simulationPhase === PHASE.NORMAL ? -2.1 : simulationPhase === PHASE.PHASE_1 ? 4.1 : 8.2,
      severity: severityByPhase,
      icon: ICONS.response,
    },
    {
      title: "AI Confidence",
      value: aiBriefing.confidence,
      unit: "%",
      decimals: 0,
      delta: simulationPhase === PHASE.NORMAL ? 0.6 : simulationPhase === PHASE.PHASE_1 ? -5.4 : 6.2,
      severity: severityByPhase,
      icon: ICONS.confidence,
    },
  ];

  const phaseLabel = {
    [PHASE.NORMAL]: "System Baseline",
    [PHASE.PHASE_1]: "Phase 1 - Subtle Anomaly",
    [PHASE.PHASE_2]: "Phase 2 - Attack Escalation",
    [PHASE.PHASE_3]: "Phase 3 - AI Response & Containment",
  }[simulationPhase];

  const attackGlowActive = simulationPhase === PHASE.PHASE_2 || simulationPhase === PHASE.PHASE_3;

  return (
    <div className="dashboard-grid min-h-screen bg-bg text-textPrimary">
      <Header systemStatus={systemStatus} timestamp={timestamp} />

      <AnimatePresence>
        {attackGlowActive ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-20 bg-[radial-gradient(circle_at_50%_15%,rgba(220,38,38,0.16),rgba(220,38,38,0.03)_42%,transparent_72%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36, ease: "easeInOut" }}
          />
        ) : null}
      </AnimatePresence>

      <main className="relative z-30 mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card, index) => (
            <KPICard key={card.title} {...card} index={index} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <LiveCharts data={data} simulationPhase={simulationPhase} />
          <AIExplanation
            confidence={aiBriefing.confidence}
            headline={aiBriefing.headline}
            summary={aiBriefing.summary}
            signals={aiBriefing.signals}
            recommendations={aiBriefing.recommendations}
            threatLevel={aiBriefing.threatLevel}
            expanded={aiBriefing.expanded}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <IncidentLog incidents={incidents} />

          <div className="space-y-6">
            <div className="glass-panel rounded-xl p-4 shadow-panel sm:p-5">
              <h2 className="text-lg font-semibold">Simulation Control</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Execute coordinated cyber attack behavior with progressive anomaly detection, escalation, and AI-led containment.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-textSecondary">{phaseLabel}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-textSecondary/90">
                Background SOC feed active every{" "}
                {Math.round((FEED_INTERVAL_BY_PHASE_MS[simulationPhase] ?? FEED_INTERVAL_BY_PHASE_MS.normal) / 1000)}s
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <motion.button
                  type="button"
                  onClick={triggerCoordinatedAttack}
                  disabled={simulationPhase !== PHASE.NORMAL}
                  className="w-full rounded-xl border border-critical/55 bg-critical/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-critical transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45"
                  whileHover={simulationPhase === PHASE.NORMAL ? { y: -2, boxShadow: "0 12px 24px rgba(220, 38, 38, 0.24)" } : {}}
                  whileTap={simulationPhase === PHASE.NORMAL ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.24 }}
                >
                  {simulationPhase === PHASE.NORMAL ? "Simulate Coordinated Attack" : "Simulation In Progress"}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={resetSystem}
                  className="w-full rounded-xl border border-accent/45 bg-accent/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-accent transition-all duration-300"
                  whileHover={{ y: -2, boxShadow: "0 10px 20px rgba(37, 99, 235, 0.2)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.24 }}
                >
                  Reset System
                </motion.button>
              </div>
            </div>

            <NetworkMap simulationPhase={simulationPhase} targetNodeId={attackTargetId} />
          </div>
        </section>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.aside
            className="fixed right-4 top-20 z-50 w-[min(390px,92vw)] rounded-xl border border-critical/70 bg-gradient-to-br from-critical/24 via-card/95 to-card/98 p-4 ring-1 ring-critical/45 shadow-[0_18px_40px_rgba(127,29,29,0.56)] backdrop-blur-md"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 46 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-critical">Security Alert</p>
            <p className="mt-1 text-sm font-semibold text-textPrimary">{toast.title}</p>
            <p className="mt-1 text-sm text-textSecondary">{toast.message}</p>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
