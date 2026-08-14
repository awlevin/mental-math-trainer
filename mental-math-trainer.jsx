import React, { useState, useEffect, useRef } from "react";

// ================= Helpers =================
const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const WINDOW = 10;
const NEEDED = 8;
const ROUND_LEN = 20;

// Ordered single-digit facts (2–9 both ways): 7?8 and 8?7 tracked separately
const ALL_FACTS = [];
for (let i = 2; i <= 9; i++) for (let j = 2; j <= 9; j++) ALL_FACTS.push([i, j]);
const factKey = (x, y) => `${x}·${y}`;

// ================= Multiplication walkthrough =================
function buildMulWalkthrough(origA, origB) {
  const isRound = (x) => x % 10 === 0;
  const isTeen = (x) => x >= 11 && x <= 19;
  const nearRound = (x) => x % 10 >= 8;
  let n = origA, m = origB;
  const nice = (x) => x < 10 || isRound(x) || isTeen(x) || nearRound(x);
  if (!nice(m) && nice(n)) [n, m] = [m, n];

  const anchor100 = () => {
    const d = 100 - n;
    return {
      name: "Anchor on 100",
      tip: `${n} is only ${d} short of 100. Multiply by 100 (trivial), then subtract the shortfall.`,
      steps: [
        { prompt: `100 × ${m}`, ans: 100 * m, note: "attach two zeros" },
        { prompt: `${d} × ${m}`, ans: d * m, note: "small multiply" },
        { prompt: `${100 * m} − ${d * m}`, ans: n * m, note: "subtract the shortfall" },
      ],
    };
  };

  if (m < 10) {
    if (n >= 91) return anchor100();
    const t = Math.floor(n / 10) * 10, o = n % 10;
    if (o === 0) {
      return {
        name: "Drop the zero",
        tip: `${n} is ${n / 10} tens — multiply the small numbers, then put the zero back.`,
        steps: [
          { prompt: `${n / 10} × ${m}`, ans: (n / 10) * m, note: "just a times-table fact" },
          { prompt: `${(n / 10) * m} × 10`, ans: n * m, note: "put the zero back" },
        ],
      };
    }
    return {
      name: "Split the tens",
      tip: `Break ${n} into ${t} + ${o}, multiply each piece, then add.`,
      steps: [
        { prompt: `${t} × ${m}`, ans: t * m, note: `${t / 10} × ${m}, then a zero` },
        { prompt: `${o} × ${m}`, ans: o * m, note: "times-table fact" },
        { prompt: `${t * m} + ${o * m}`, ans: n * m, note: "add the two pieces" },
      ],
    };
  }
  if (isRound(m)) {
    const t = Math.floor(n / 10) * 10, o = n % 10;
    return {
      name: "Drop the zero",
      tip: `× ${m} is the same as × ${m / 10}, then × 10. Solve the easy version first.`,
      steps: [
        { prompt: `${n} × ${m / 10}`, ans: n * (m / 10), note: o === 0 ? "times-table fact plus a zero" : `${t} × ${m / 10} + ${o} × ${m / 10} = ${t * (m / 10)} + ${o * (m / 10)}` },
        { prompt: `${n * (m / 10)} × 10`, ans: n * m, note: "put the zero back" },
      ],
    };
  }
  if (m >= 91 && n < 91) [n, m] = [m, n];
  if (n >= 91) return anchor100();
  if (isTeen(m) && m % 10 < 8) {
    const r = m - 10;
    return {
      name: "×10 plus the rest",
      tip: `× ${m} is × 10 plus × ${r}. Two easy multiplies, one add.`,
      steps: [
        { prompt: `${n} × 10`, ans: n * 10, note: "attach a zero" },
        { prompt: `${n} × ${r}`, ans: n * r, note: r === 1 ? "it's just the number itself" : `${Math.floor(n / 10) * 10} × ${r} + ${n % 10} × ${r}` },
        { prompt: `${n * 10} + ${n * r}`, ans: n * m, note: "add the pieces" },
      ],
    };
  }
  if (nearRound(m)) {
    const up = m + (10 - (m % 10)), d = up - m;
    return {
      name: "Round up, back off",
      tip: `${m} is almost ${up}. Multiply by ${up} (easy), then subtract the ${d === 1 ? "extra copy" : `${d} extra copies`}.`,
      steps: [
        { prompt: `${n} × ${up}`, ans: n * up, note: `${n} × ${up / 10}, then a zero` },
        { prompt: `${n} × ${d}`, ans: n * d, note: d === 1 ? "the number itself" : "small multiply" },
        { prompt: `${n * up} − ${n * d}`, ans: n * m, note: "back off the overshoot" },
      ],
    };
  }
  const bt = Math.floor(m / 10) * 10, bo = m % 10;
  return {
    name: "Split into tens and ones",
    tip: `Break ${m} into ${bt} + ${bo}. Two multiplies, then add.`,
    steps: [
      { prompt: `${n} × ${bt}`, ans: n * bt, note: `${n} × ${bt / 10}, then a zero` },
      { prompt: `${n} × ${bo}`, ans: n * bo, note: `${Math.floor(n / 10) * 10} × ${bo} + ${n % 10} × ${bo}` },
      { prompt: `${n * bt} + ${n * bo}`, ans: n * m, note: "add the pieces" },
    ],
  };
}

// ================= Addition walkthrough =================
function buildAddWalkthrough(origA, origB) {
  const n = Math.max(origA, origB), m = Math.min(origA, origB); // add the smaller onto the bigger
  const isRound = (x) => x % 10 === 0;

  if (m < 10) {
    const o = n % 10;
    if (o + m < 10) {
      return {
        name: "Just the ones",
        tip: `${o} + ${m} stays under 10, so only the ones digit changes.`,
        steps: [
          { prompt: `${o} + ${m}`, ans: o + m, note: "ones digits only" },
          { prompt: `${n - o} + ${o + m}`, ans: n + m, note: "tens digit is untouched" },
        ],
      };
    }
    const toTen = 10 - o, rest = m - toTen, nextTen = n + toTen;
    if (rest === 0) {
      return {
        name: "Bridge through ten",
        tip: `${m} is exactly what fills ${n} to the next ten.`,
        steps: [{ prompt: `${n} + ${toTen}`, ans: n + m, note: "lands right on the ten" }],
      };
    }
    return {
      name: "Bridge through ten",
      tip: `Fill up to the next ten first, then add what's left over.`,
      steps: [
        { prompt: `${n} + ${toTen}`, ans: nextTen, note: `${toTen} fills it to ${nextTen}` },
        { prompt: `${nextTen} + ${rest}`, ans: n + m, note: "add the leftover" },
      ],
    };
  }
  if (m >= 100) {
    const h = Math.floor(m / 100) * 100;
    const t = Math.floor((m % 100) / 10) * 10;
    const o = m % 10;
    const steps = [];
    let acc = n;
    steps.push({ prompt: `${acc} + ${h}`, ans: acc + h, note: "hundreds hop" });
    acc += h;
    if (t) { steps.push({ prompt: `${acc} + ${t}`, ans: acc + t, note: "tens hop" }); acc += t; }
    if (o) { steps.push({ prompt: `${acc} + ${o}`, ans: acc + o, note: "ones hop" }); acc += o; }
    return {
      name: "Left to right",
      tip: `Add ${m} biggest place first: hundreds, then tens, then ones. One carry at a time, never more.`,
      steps,
    };
  }
  if (isRound(m)) {
    const t = Math.floor(n / 10) * 10, o = n % 10;
    return {
      name: "Tens jump",
      tip: `Adding ${m} only moves the tens — the ones digit doesn't change.`,
      steps: [
        { prompt: `${t} + ${m}`, ans: t + m, note: "tens only" },
        { prompt: `${t + m} + ${o}`, ans: n + m, note: "ones come along unchanged" },
      ],
    };
  }
  if (m % 10 >= 8) {
    const up = m + (10 - (m % 10)), d = up - m;
    return {
      name: "Round and adjust",
      tip: `${m} is almost ${up}. Add ${up} (a clean tens jump), then take back ${d}.`,
      steps: [
        { prompt: `${n} + ${up}`, ans: n + up, note: "round tens jump" },
        { prompt: `${n + up} − ${d}`, ans: n + m, note: "give back the overshoot" },
      ],
    };
  }
  const bt = Math.floor(m / 10) * 10, bo = m % 10;
  return {
    name: "Tens, then ones",
    tip: `Add ${m} in two hops: ${bt} first, then ${bo}.`,
    steps: [
      { prompt: `${n} + ${bt}`, ans: n + bt, note: "tens hop" },
      { prompt: `${n + bt} + ${bo}`, ans: n + m, note: bo + (n % 10) >= 10 ? "this one bridges through a ten" : "ones hop" },
    ],
  };
}

// ================= Level sets =================
const MUL_LEVELS = [
  { name: "Warm-up", desc: "2-digit × 2–5", gen: () => [rand(12, 99), rand(2, 5)] },
  { name: "Big singles", desc: "2-digit × 6–9", gen: () => [rand(12, 99), rand(6, 9)] },
  { name: "Friendly pairs", desc: "2-digit × teens & round tens", gen: () => [rand(12, 99), pick([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 40, 50, 60, 70, 80, 90])] },
  { name: "Stretch", desc: "2-digit × 21–49", gen: () => [rand(21, 99), rand(21, 49)] },
  { name: "Full board", desc: "2-digit × 2-digit", gen: () => [rand(21, 99), rand(21, 99)] },
];

const ADD_LEVELS = [
  { name: "Warm-up", desc: "2-digit + single digit", gen: () => [rand(12, 99), rand(2, 9)] },
  { name: "Tens & teens", desc: "2-digit + teens & round tens", gen: () => [rand(12, 99), pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 11, 12, 13, 14, 15, 16, 17, 18, 19])] },
  { name: "Stretch", desc: "2-digit + 21–49", gen: () => [rand(21, 99), rand(21, 49)] },
  { name: "Full board", desc: "2-digit + 51–99 (carries!)", gen: () => [rand(21, 99), rand(51, 99)] },
  { name: "Big sums", desc: "3-digit sums", gen: () => [rand(102, 999), Math.random() < 0.5 ? rand(21, 99) : rand(102, 999)] },
];

// ================= Shared UI =================
function Keypad({ onPress, onBack, onSubmit }) {
  return (
    <div className="pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button key={d} className="key" onClick={() => onPress(String(d))}>{d}</button>
      ))}
      <button className="key back" onClick={onBack}>⌫</button>
      <button className="key" onClick={() => onPress("0")}>0</button>
      <button className="key action" onClick={onSubmit}>Check</button>
    </div>
  );
}

// ================= Generic timed Sprint =================
function Sprint({ active, config }) {
  const { symbol, apply, storageKey, factNoun } = config;
  const [problem, setProblem] = useState(() => [rand(2, 9), rand(2, 9)]);
  const [input, setInput] = useState("");
  const [tPhase, setTPhase] = useState("solve"); // solve | flash | wrongpause | roundend
  const [tFlash, setTFlash] = useState(null);
  const [pending, setPending] = useState(null);
  const [tRound, setTRound] = useState([]);
  const [tHistory, setTHistory] = useState([]);
  const [factStats, setFactStats] = useState({});
  const [isReview, setIsReview] = useState(false);
  const [heatMetric, setHeatMetric] = useState("seen");
  const [startTime, setStartTime] = useState(Date.now());
  const [lastTime, setLastTime] = useState(null);
  const retryRef = useRef([]);
  const countRef = useRef(0);
  const lastKeyRef = useRef(null);
  const timeoutRef = useRef(null);
  const loadedRef = useRef(false);

  const [a, b] = problem;

  // ---- persistence ----
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get(storageKey);
          if (r?.value) {
            const d = JSON.parse(r.value);
            if (d.factStats) {
              // migrate older key formats ("7×8") to the current delimiter ("7·8")
              const migrated = {};
              for (const [k, v] of Object.entries(d.factStats)) {
                migrated[k.replace("×", "·")] = v;
              }
              setFactStats(migrated);
            }
            if (d.tHistory) setTHistory(d.tHistory);
          }
        }
      } catch (e) { /* fresh start */ }
      loadedRef.current = true;
    })();
  }, [storageKey]);

  useEffect(() => {
    if (!loadedRef.current || !window.storage) return;
    if (tPhase !== "roundend" && tHistory.length === 0) return;
    (async () => {
      try {
        await window.storage.set(storageKey, JSON.stringify({ factStats, tHistory }));
      } catch (e) { console.error("save failed", e); }
    })();
  }, [tPhase, tHistory]);

  // ---- adaptive picker ----
  const pickProblem = () => {
    const count = countRef.current;
    let key = null, review = false;
    const dueIdx = retryRef.current.findIndex((r) => r.due <= count);
    if (dueIdx !== -1) {
      key = retryRef.current[dueIdx].key;
      retryRef.current.splice(dueIdx, 1);
      review = true;
    } else {
      const ewmas = Object.values(factStats).map((s) => s.ewma).filter((x) => x != null);
      const globalAvg = ewmas.length ? ewmas.reduce((s, x) => s + x, 0) / ewmas.length : null;
      const seens = ALL_FACTS.map(([x, y]) => factStats[factKey(x, y)]?.seen || 0);
      const maxSeen = Math.max(...seens);
      const weights = ALL_FACTS.map(([x, y], i) => {
        const s = factStats[factKey(x, y)];
        let w;
        if (!s) w = 3 + maxSeen * 0.5;
        else {
          w = 1 + 5 * (s.wrong / s.seen);
          if (globalAvg && s.ewma > globalAvg) w += Math.min(2.5, ((s.ewma - globalAvg) / globalAvg) * 3);
        }
        if (maxSeen > 0) w += ((maxSeen - seens[i]) / maxSeen) * 2;
        return w;
      });
      for (let tries = 0; tries < 4; tries++) {
        const total = weights.reduce((s, x) => s + x, 0);
        let r = Math.random() * total;
        let idx = 0;
        for (; idx < weights.length - 1; idx++) { r -= weights[idx]; if (r <= 0) break; }
        const k = factKey(...ALL_FACTS[idx]);
        if (k !== lastKeyRef.current || tries === 3) {
          key = k;
          const s = factStats[k];
          review = !!s && s.seen > 0 && s.wrong / s.seen > 0.25;
          break;
        }
      }
    }
    lastKeyRef.current = key;
    countRef.current += 1;
    const [x, y] = key.split("·").map(Number);
    return { pair: [x, y], review };
  };

  const newProblem = () => {
    const { pair, review } = pickProblem();
    setProblem(pair);
    setIsReview(review);
    setInput("");
    setTFlash(null);
    setTPhase("solve");
    setStartTime(Date.now());
  };

  const tTotal = tRound.reduce((s, r) => s + r.time, 0);

  const commitResult = (correct, elapsed) => {
    const entry = { a, b, correct, time: elapsed };
    const nextRound = [...tRound, entry];
    setTRound(nextRound);
    const k = factKey(a, b);
    setFactStats((fs) => {
      const s = fs[k] || { seen: 0, wrong: 0, ewma: null };
      return { ...fs, [k]: { seen: s.seen + 1, wrong: s.wrong + (correct ? 0 : 1), ewma: s.ewma == null ? elapsed : 0.6 * s.ewma + 0.4 * elapsed } };
    });
    if (!correct) {
      retryRef.current.push({ key: k, due: countRef.current + rand(2, 4) });
      retryRef.current.push({ key: k, due: countRef.current + rand(7, 10) });
    } else {
      const roundAvg = tRound.length ? tTotal / tRound.length : null;
      if (elapsed > Math.max(3, (roundAvg || 3) * 1.6)) {
        retryRef.current.push({ key: k, due: countRef.current + rand(4, 7) });
      }
    }
    return nextRound;
  };

  const submit = () => {
    if (tPhase !== "solve" || input === "") return;
    const elapsed = (Date.now() - startTime) / 1000;
    const correct = parseInt(input, 10) === apply(a, b);
    setLastTime(elapsed);
    setTFlash({ correct, ans: apply(a, b), time: elapsed });
    if (correct) {
      setInput("");
      const nextRound = commitResult(true, elapsed);
      if (nextRound.length >= ROUND_LEN) setTPhase("roundend");
      else { setTPhase("flash"); timeoutRef.current = setTimeout(newProblem, 500); }
    } else {
      setPending({ time: elapsed, wrongInput: input });
      setTPhase("wrongpause");
    }
  };

  const resolvePending = (decision) => {
    if (!pending) return;
    const nextRound = commitResult(decision === "typo", pending.time);
    setPending(null);
    setInput("");
    if (nextRound.length >= ROUND_LEN) setTPhase("roundend");
    else newProblem();
  };

  const startNewRound = () => {
    const total = tRound.reduce((s, r) => s + r.time, 0);
    const right = tRound.filter((r) => r.correct).length;
    setTHistory((h) => [...h, { avg: total / tRound.length, acc: Math.round((right / tRound.length) * 100), total }]);
    setTRound([]);
    newProblem();
  };

  const canType = tPhase === "solve";
  const press = (d) => { if (canType && input.length < 5) setInput((v) => (v === "0" ? String(d) : v + d)); };
  const backspace = () => canType && setInput((v) => v.slice(0, -1));

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (canType) {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") backspace();
        else if (e.key === "Enter") submit();
      } else if (e.key === "Enter") {
        if (tPhase === "wrongpause") resolvePending("wrong");
        else if (tPhase === "roundend") startNewRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // ---- derived ----
  const tCount = tRound.length;
  const tRight = tRound.filter((r) => r.correct).length;
  const tAvg = tCount ? tTotal / tCount : null;
  const tAcc = tCount ? Math.round((tRight / tCount) * 100) : null;
  const bestRoundAvg = tHistory.length ? Math.min(...tHistory.map((h) => h.avg)) : null;
  const slowest = [...tRound.filter((r) => r.correct)].sort((x, y) => y.time - x.time).slice(0, 3);
  const missed = tRound.filter((r) => !r.correct);
  const globalEwmaAvg = (() => {
    const es = Object.values(factStats).map((s) => s.ewma).filter((x) => x != null);
    return es.length ? es.reduce((s, x) => s + x, 0) / es.length : null;
  })();
  const weakSpots = Object.entries(factStats)
    .filter(([, s]) => s.seen > 0 && (s.wrong > 0 || (globalEwmaAvg && s.ewma > globalEwmaAvg * 1.3)))
    .map(([k, s]) => ({ k, s, score: (s.wrong / s.seen) * 5 + (s.ewma || 0) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);
  const lifeSeen = Object.values(factStats).reduce((s, x) => s + x.seen, 0);
  const lifeWrong = Object.values(factStats).reduce((s, x) => s + x.wrong, 0);
  const lifeAcc = lifeSeen ? Math.round(((lifeSeen - lifeWrong) / lifeSeen) * 100) : null;
  const lifeAvg = lifeSeen ? Object.values(factStats).reduce((s, x) => s + (x.ewma || 0) * x.seen, 0) / lifeSeen : null;
  const heatVal = (i, j) => {
    const s = factStats[factKey(i, j)];
    if (!s) return null;
    return heatMetric === "seen" ? s.seen : heatMetric === "wrong" ? s.wrong : s.ewma;
  };
  const heatMax = Math.max(0.001, ...ALL_FACTS.map(([i, j]) => heatVal(i, j) || 0));
  const HEAT_COLORS = { seen: "90,130,190", time: "199,125,46", wrong: "210,59,46" };
  const fmtFact = (k) => k.replace("·", ` ${symbol} `);

  return (
    <>
      <div className="card">
        {tPhase === "roundend" ? (
          <div className="roundend">
            <h2>Round {tHistory.length + 1} complete</h2>
            <div className="bigstats">
              <div className="bigstat"><div className="v">{tAvg.toFixed(1)}s</div><div className="l">Avg / problem</div></div>
              <div className="bigstat"><div className="v">{tTotal.toFixed(0)}s</div><div className="l">Total</div></div>
              <div className="bigstat"><div className="v">{tAcc}%</div><div className="l">Accuracy</div></div>
            </div>
            {missed.length > 0 && (
              <div className="factlist">
                <h3>Missed — drill these</h3>
                {missed.map((r, i) => (
                  <div key={i} className="fact wrongf">
                    <span>{r.a} {symbol} {r.b} = {apply(r.a, r.b)}</span>
                    <span>{r.time.toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            )}
            {slowest.length > 0 && (
              <div className="factlist">
                <h3>Slowest correct</h3>
                {slowest.map((r, i) => (
                  <div key={i} className="fact slow">
                    <span>{r.a} {symbol} {r.b} = {apply(r.a, r.b)}</span>
                    <span>{r.time.toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            )}
            {weakSpots.length > 0 && (
              <div className="factlist">
                <h3>Getting extra reps next round</h3>
                {weakSpots.map(({ k, s }) => (
                  <div key={k} className="fact focus">
                    <span>{fmtFact(k)}</span>
                    <span>{s.wrong > 0 ? `${s.wrong} miss${s.wrong > 1 ? "es" : ""} · ` : ""}{s.ewma.toFixed(1)}s avg</span>
                  </div>
                ))}
              </div>
            )}
            {lifeSeen > 0 && (
              <div className="factlist">
                <h3>Every {factNoun}, all time</h3>
                <div className="lifetime">{lifeSeen} answered · {lifeAcc}% right · {lifeAvg.toFixed(1)}s avg</div>
                <div className="metricchips">
                  {[["seen", "Attempts"], ["time", "Avg time"], ["wrong", "Misses"]].map(([m, label]) => (
                    <button key={m} className={`mchip ${heatMetric === m ? "active" : ""}`} onClick={() => setHeatMetric(m)}>{label}</button>
                  ))}
                </div>
                <div className="heat">
                  <div className="hcell hhead">{symbol}</div>
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((j) => <div key={`h${j}`} className="hcell hhead">{j}</div>)}
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <React.Fragment key={`r${i}`}>
                      <div className="hcell hhead">{i}</div>
                      {[2, 3, 4, 5, 6, 7, 8, 9].map((j) => {
                        const v = heatVal(i, j);
                        const alpha = v == null ? 0 : Math.max(0.1, v / heatMax);
                        const dark = alpha > 0.55;
                        return (
                          <div key={`c${i}-${j}`} className="hcell" style={v == null ? {} : { background: `rgba(${HEAT_COLORS[heatMetric]},${alpha.toFixed(2)})`, color: dark ? "#fff" : "#1B2A4A" }}>
                            {v == null ? "·" : heatMetric === "time" ? v.toFixed(1) : v}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                <div className="heatcaption">
                  {heatMetric === "seen" && `Times answered, row ${symbol} column — both orders tracked separately. Darker = more reps.`}
                  {heatMetric === "time" && "Recent average seconds per fact. Darker = slower."}
                  {heatMetric === "wrong" && "Total misses per fact. Darker = missed more."}
                </div>
              </div>
            )}
            {tHistory.length > 0 && (
              <div className="history">
                <h3>Past rounds (avg / problem)</h3>
                <div className="histrow">
                  {tHistory.map((h, i) => (
                    <span key={i} className={`histchip ${h.avg === bestRoundAvg ? "best" : ""}`}>R{i + 1}: {h.avg.toFixed(1)}s</span>
                  ))}
                </div>
              </div>
            )}
            <button className="nextbtn" onClick={startNewRound} style={{ marginTop: 12 }}>
              Start round {tHistory.length + 2}
            </button>
          </div>
        ) : (
          <>
            <div className="levelname">
              Round {tHistory.length + 1} · Problem {tCount + 1} of {ROUND_LEN}
              {isReview && <span className="reviewtag">Review</span>}
            </div>
            <div className="roundbar">
              {Array.from({ length: ROUND_LEN }).map((_, i) => {
                const r = tRound[i];
                return <div key={i} className={`seg ${r ? (r.correct ? "hit" : "miss") : ""}`} />;
              })}
            </div>
            <div className="inlineprob">
              <div className="expr">{a} <span className="x">{symbol}</span> {b}</div>
              <div className={`ans ${tPhase === "flash" ? (tFlash?.correct ? "good" : "bad") : tPhase === "wrongpause" ? "bad struck" : ""}`}>
                {tPhase === "flash" ? apply(a, b) : tPhase === "wrongpause" ? pending?.wrongInput : input || <span className="caret" />}
              </div>
            </div>
            <div className="feedback">
              {(tPhase === "flash" || tPhase === "wrongpause") && tFlash && (
                <>
                  <div className={`big ${tFlash.correct ? "good" : "bad"}`}>
                    {tFlash.correct ? "Correct" : `Answer: ${tFlash.ans}`}
                  </div>
                  <div className="time">{tFlash.time.toFixed(1)}s</div>
                </>
              )}
            </div>
            {tPhase === "wrongpause" ? (
              <>
                <button className="nextbtn" onClick={() => resolvePending("wrong")}>Continue</button>
                <button className="ghostbtn" onClick={() => resolvePending("typo")}>Just a typo — count it correct</button>
              </>
            ) : (
              <Keypad onPress={press} onBack={backspace} onSubmit={submit} />
            )}
          </>
        )}
      </div>
      <div className="stats">
        <div className="stat"><div className="v">{lastTime === null ? "–" : `${lastTime.toFixed(1)}s`}</div><div className="l">Last</div></div>
        <div className="stat"><div className="v">{tAvg === null ? "–" : `${tAvg.toFixed(1)}s`}</div><div className="l">Round avg</div></div>
        <div className="stat"><div className="v">{tAcc === null ? "–" : `${tAcc}%`}</div><div className="l">Accuracy</div></div>
        <div className="stat"><div className="v">{bestRoundAvg === null ? "–" : `${bestRoundAvg.toFixed(1)}s`}</div><div className="l">Best round</div></div>
      </div>
    </>
  );
}

// ================= Generic Ladder =================
function Ladder({ active, config }) {
  const { levels, symbol, apply, buildWalkthrough } = config;
  const [level, setLevel] = useState(0);
  const [problem, setProblem] = useState(() => levels[0].gen());
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("solve"); // solve | correct | walkthrough | walkdone | levelup
  const [walk, setWalk] = useState(null);
  const [subFlash, setSubFlash] = useState(null);
  const [windowResults, setWindowResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totals, setTotals] = useState({ right: 0, wrong: 0 });
  const [startTime, setStartTime] = useState(Date.now());
  const [lastTime, setLastTime] = useState(null);
  const [times, setTimes] = useState([]);
  const timeoutRef = useRef(null);
  const flashRef = useRef(null);

  const [a, b] = problem;

  const newProblem = (lvl) => {
    setProblem(levels[lvl].gen());
    setInput("");
    setWalk(null);
    setSubFlash(null);
    setPhase("solve");
    setStartTime(Date.now());
  };

  const submit = () => {
    if (input === "") return;
    if (phase === "solve") {
      const elapsed = (Date.now() - startTime) / 1000;
      const correct = parseInt(input, 10) === apply(a, b);
      setLastTime(elapsed);
      const nextWindow = [...windowResults, correct].slice(-WINDOW);
      if (correct) {
        setTimes((t) => [...t, elapsed]);
        setStreak((s) => { const ns = s + 1; setBestStreak((bs) => Math.max(bs, ns)); return ns; });
        setTotals((t) => ({ ...t, right: t.right + 1 }));
        const passed = nextWindow.length === WINDOW && nextWindow.filter(Boolean).length >= NEEDED && level < levels.length - 1;
        if (passed) { setWindowResults([]); setPhase("levelup"); }
        else {
          setWindowResults(nextWindow);
          setPhase("correct");
          timeoutRef.current = setTimeout(() => newProblem(level), 700);
        }
      } else {
        setStreak(0);
        setTotals((t) => ({ ...t, wrong: t.wrong + 1 }));
        setWindowResults(nextWindow);
        const w = buildWalkthrough(a, b);
        setWalk({ ...w, idx: 0, misses: 0, results: [], attempt: input });
        setInput("");
        setPhase("walkthrough");
      }
      return;
    }
    if (phase === "walkthrough" && walk) {
      const step = walk.steps[walk.idx];
      const correct = parseInt(input, 10) === step.ans;
      clearTimeout(flashRef.current);
      if (correct) {
        setSubFlash("good");
        flashRef.current = setTimeout(() => setSubFlash(null), 400);
        advanceStep(false);
      } else {
        const misses = walk.misses + 1;
        setSubFlash("bad");
        flashRef.current = setTimeout(() => setSubFlash(null), 400);
        if (misses >= 2) advanceStep(true);
        else { setWalk({ ...walk, misses }); setInput(""); }
      }
    }
  };

  const advanceStep = (revealed) => {
    setWalk((w) => {
      const results = [...w.results, { revealed }];
      const idx = w.idx + 1;
      if (idx >= w.steps.length) { setPhase("walkdone"); return { ...w, results }; }
      return { ...w, idx, misses: 0, results };
    });
    setInput("");
  };

  const skipWalkthrough = () => {
    setWalk((w) => ({ ...w, results: w.steps.map((_, i) => w.results[i] || { revealed: true }) }));
    setPhase("walkdone");
    setInput("");
  };

  const advanceLevel = () => { const next = level + 1; setLevel(next); newProblem(next); };
  const switchLevel = (i) => { clearTimeout(timeoutRef.current); setLevel(i); setWindowResults([]); newProblem(i); };

  const canType = phase === "solve" || phase === "walkthrough";
  const press = (d) => { if (canType && input.length < 5) setInput((v) => (v === "0" ? String(d) : v + d)); };
  const backspace = () => canType && setInput((v) => v.slice(0, -1));

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (canType) {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") backspace();
        else if (e.key === "Enter") submit();
      } else if (e.key === "Enter") {
        if (phase === "walkdone") newProblem(level);
        else if (phase === "levelup") advanceLevel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => { clearTimeout(timeoutRef.current); clearTimeout(flashRef.current); }, []);

  const attempts = totals.right + totals.wrong;
  const accuracy = attempts ? Math.round((totals.right / attempts) * 100) : null;
  const avgTime = times.length ? (times.slice(-15).reduce((s, t) => s + t, 0) / Math.min(times.length, 15)).toFixed(1) : null;
  const inWindow = windowResults.filter(Boolean).length;
  const inWalk = phase === "walkthrough" || phase === "walkdone";

  return (
    <>
      <div className="ladder">
        {levels.map((L, i) => (
          <button key={i} className={`rung ${i === level ? "active" : ""} unlocked`} onClick={() => switchLevel(i)}>
            <span className="n">{i + 1}</span>
            {L.name}
          </button>
        ))}
      </div>
      <div className="card">
        {phase === "levelup" ? (
          <div className="levelup">
            <h2>Level cleared</h2>
            <p>{NEEDED} of your last {WINDOW} correct. Next up: <strong>{levels[level + 1].name}</strong> — {levels[level + 1].desc}.</p>
            <button className="nextbtn" onClick={advanceLevel}>Start {levels[level + 1].name}</button>
          </div>
        ) : (
          <>
            <div className="levelname">Level {level + 1} · {levels[level].name}</div>
            <div className="leveldesc">{levels[level].desc}</div>
            <div className={`worksheet ${inWalk ? "compact" : ""}`}>
              <div className="stack">
                {inWalk ? (
                  <>
                    <div className="row">{a} {symbol} {b}</div>
                    <div className="rule">
                      <div className="answer">
                        ={" "}
                        {walk?.attempt && <span className="attempt">{walk.attempt}</span>}
                        {phase === "walkdone" ? <span className="finalgood">{apply(a, b)}</span> : <span className="unknown">?</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="row">{a}</div>
                    <div className="row op"><span className="times">{symbol}</span>{b}</div>
                    <div className="rule">
                      <div className={`answer ${phase === "correct" ? "good" : ""}`}>
                        {input || (phase === "solve" ? <span className="caret" /> : "")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {phase === "correct" && (
              <div className="feedback">
                <div className="big good">Correct</div>
                <div className="time">{lastTime.toFixed(1)}s</div>
              </div>
            )}
            {inWalk && walk && (
              <div className="walk">
                <div className="strategy">
                  <span className="tag">Strategy</span>
                  <span className="tname">{walk.name}</span>
                </div>
                <div className="tip">{walk.tip}</div>
                <div className="substeps">
                  {walk.steps.map((s, i) => {
                    const isDone = i < walk.results.length;
                    const isCurrent = phase === "walkthrough" && i === walk.idx;
                    const revealed = isDone && walk.results[i]?.revealed;
                    return (
                      <div key={i}>
                        <div className={`substep ${isDone ? `done ${revealed ? "revealed" : ""}` : isCurrent ? "current" : "pending"} ${isCurrent && subFlash ? `flash-${subFlash}` : ""}`}>
                          <span className="stepno">{i + 1}</span>
                          <span className="expr">{s.prompt} =</span>
                          {isDone ? <span className="result">{s.ans}</span> : isCurrent ? <span className="subinput">{input || <span className="caret" />}</span> : <span className="result">·</span>}
                        </div>
                        {(isCurrent || (isDone && revealed)) && s.note && <div className="stepnote">↳ {s.note}</div>}
                      </div>
                    );
                  })}
                </div>
                {phase === "walkthrough" && (
                  <div className="walkfoot">
                    <span className="walkhint">{walk.misses > 0 ? "Not quite — try once more" : "Solve this step"}</span>
                    <button className="skip" onClick={skipWalkthrough}>Reveal all</button>
                  </div>
                )}
                {phase === "walkdone" && (
                  <div className="walkdone-msg">
                    <span className="eq">{a} {symbol} {b} = {apply(a, b)}</span>
                  </div>
                )}
              </div>
            )}
            {!inWalk && (
              <>
                <div className="dots">
                  {Array.from({ length: WINDOW }).map((_, i) => {
                    const r = windowResults[i];
                    return <div key={i} className={`dot ${r === true ? "hit" : r === false ? "miss" : ""}`} />;
                  })}
                </div>
                <div className="dotlabel">
                  {level < levels.length - 1
                    ? `${inWindow < NEEDED ? NEEDED - inWindow : 0} more right in your last ${WINDOW} to level up`
                    : "Top level — keep sharpening"}
                </div>
              </>
            )}
            {phase === "walkdone" ? (
              <button className="nextbtn" onClick={() => newProblem(level)}>Next problem</button>
            ) : (
              <Keypad onPress={press} onBack={backspace} onSubmit={submit} />
            )}
          </>
        )}
      </div>
      <div className="stats">
        <div className="stat"><div className="v">{streak}</div><div className="l">Streak</div></div>
        <div className="stat"><div className="v">{bestStreak}</div><div className="l">Best</div></div>
        <div className="stat"><div className="v">{accuracy === null ? "–" : `${accuracy}%`}</div><div className="l">Accuracy</div></div>
        <div className="stat"><div className="v">{avgTime === null ? "–" : `${avgTime}s`}</div><div className="l">Avg time</div></div>
      </div>
    </>
  );
}

// ================= Exercise registry =================
const EXERCISES = [
  {
    id: "mul-sprint", group: "Multiplication", label: "Times-table sprint",
    sub: "Single-digit facts, timed rounds",
    kind: "sprint",
    config: { symbol: "×", apply: (a, b) => a * b, storageKey: "mmt-tables-v1", factNoun: "fact" },
  },
  {
    id: "mul-ladder", group: "Multiplication", label: "Two-digit ladder",
    sub: "5 levels up to 2-digit × 2-digit",
    kind: "ladder",
    config: { symbol: "×", apply: (a, b) => a * b, levels: MUL_LEVELS, buildWalkthrough: buildMulWalkthrough },
  },
  {
    id: "add-sprint", group: "Addition", label: "Number bonds sprint",
    sub: "Single-digit sums — the atoms of every carry",
    kind: "sprint",
    config: { symbol: "+", apply: (a, b) => a + b, storageKey: "mmt-add-bonds-v1", factNoun: "bond" },
  },
  {
    id: "add-ladder", group: "Addition", label: "Two-digit ladder",
    sub: "5 levels up to 3-digit sums",
    kind: "ladder",
    config: { symbol: "+", apply: (a, b) => a + b, levels: ADD_LEVELS, buildWalkthrough: buildAddWalkthrough },
  },
];

// ================= App shell =================
export default function MentalMathTrainer() {
  const [activeId, setActiveId] = useState("mul-sprint");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeEx = EXERCISES.find((e) => e.id === activeId);
  const groups = [...new Set(EXERCISES.map((e) => e.group))];

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        .root {
          min-height: 100vh;
          font-family: 'Archivo', sans-serif;
          color: #1B2A4A;
          background-color: #FAFBF7;
          background-image:
            linear-gradient(rgba(90,130,190,0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(90,130,190,0.14) 1px, transparent 1px);
          background-size: 24px 24px;
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 16px 32px;
        }
        .frame { width: 100%; max-width: 420px; }

        .topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .burger {
          width: 42px; height: 42px; border-radius: 10px; border: 1.5px solid #D8DFE9;
          background: #fff; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 4px; flex-shrink: 0;
        }
        .burger span { display: block; width: 18px; height: 2px; background: #1B2A4A; border-radius: 1px; }
        .titleblock { min-width: 0; }
        .eyebrow { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: #5A82BE; }
        .titleblock h1 { font-size: 19px; font-weight: 800; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .scrim {
          position: fixed; inset: 0; background: rgba(27,42,74,0.35); z-index: 40;
          opacity: 0; pointer-events: none; transition: opacity .2s;
        }
        .scrim.open { opacity: 1; pointer-events: auto; }
        .drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 270px; z-index: 50;
          background: #fff; border-right: 1.5px solid #D8DFE9;
          transform: translateX(-102%); transition: transform .22s ease;
          padding: 20px 14px; overflow-y: auto;
        }
        .drawer.open { transform: translateX(0); }
        @media (prefers-reduced-motion: reduce) { .drawer, .scrim { transition: none; } }
        .drawer .dtitle { font-size: 15px; font-weight: 800; margin-bottom: 16px; padding-left: 6px; }
        .dgroup { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; color: #8A97AC; margin: 14px 6px 6px; }
        .ditem {
          display: block; width: 100%; text-align: left; border: none; background: none;
          padding: 10px 10px; border-radius: 10px; cursor: pointer; font-family: 'Archivo';
        }
        .ditem .dlabel { font-size: 14px; font-weight: 700; color: #1B2A4A; }
        .ditem .dsub { font-size: 11px; color: #8A97AC; margin-top: 1px; }
        .ditem.active { background: #1B2A4A; }
        .ditem.active .dlabel { color: #FAFBF7; }
        .ditem.active .dsub { color: #9FB0CC; }
        .ditem:not(.active):hover { background: #EDF1F6; }

        .ladder { display: flex; gap: 6px; margin-bottom: 14px; }
        .rung {
          flex: 1; cursor: pointer; padding: 7px 2px 6px;
          background: #fff; border: 1.5px solid #D8DFE9; border-radius: 8px;
          font-family: 'Archivo'; font-size: 10px; font-weight: 700; color: #8A97AC;
          line-height: 1.2; transition: all .15s;
        }
        .rung .n { display:block; font-family:'IBM Plex Mono'; font-size: 14px; }
        .rung.active { background: #1B2A4A; border-color: #1B2A4A; color: #FAFBF7; }
        .rung.unlocked:not(.active):hover { border-color: #1B2A4A; color: #1B2A4A; }

        .card {
          background: #fff; border: 1.5px solid #D8DFE9; border-radius: 14px;
          padding: 18px 18px 16px; box-shadow: 0 2px 0 rgba(27,42,74,0.06);
        }
        .levelname { font-size: 13px; font-weight: 700; }
        .leveldesc { font-size: 12px; color: #8A97AC; margin-bottom: 10px; }

        .roundbar { height: 8px; background: #E4E9F1; border-radius: 4px; margin: 8px 0 4px; overflow: hidden; display: flex; }
        .roundbar .seg { height: 100%; flex: 1; }
        .roundbar .seg.hit { background: #2E7D4F; }
        .roundbar .seg.miss { background: #D23B2E; }
        .roundbar .seg + .seg { border-left: 1px solid #FAFBF7; }

        .worksheet { font-family: 'IBM Plex Mono', monospace; font-weight: 600; display: flex; flex-direction: column; align-items: center; margin: 6px 0 10px; }
        .worksheet.compact { margin: 0 0 6px; }
        .stack { text-align: right; }
        .stack .row { font-size: 44px; line-height: 1.1; letter-spacing: 0.04em; }
        .worksheet.compact .stack { display: flex; gap: 10px; align-items: baseline; }
        .worksheet.compact .stack .row { font-size: 22px; }
        .worksheet.compact .rule { border: none; margin: 0; padding: 0; }
        .worksheet.compact .answer { font-size: 22px; min-height: 0; }
        .stack .row.op { position: relative; }
        .stack .row.op .times { position: absolute; left: -1.1em; color: #5A82BE; }
        .rule { border-top: 3px solid #1B2A4A; margin-top: 6px; padding-top: 8px; }
        .answer { font-size: 44px; min-height: 52px; letter-spacing: 0.04em; color: #1B2A4A; }
        .answer .caret { display: inline-block; width: 2px; height: 38px; background: #5A82BE; vertical-align: -4px; animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .answer .caret, .inlineprob .ans .caret, .substep .subinput .caret { animation: none; } .substep.flash-bad { animation: none !important; } }
        .answer.good { color: #2E7D4F; }
        .answer .attempt { color: #D23B2E; text-decoration: line-through; text-decoration-thickness: 3px; margin-right: 10px; }
        .answer .finalgood { color: #2E7D4F; }
        .answer .unknown { color: #8A97AC; }

        .inlineprob { font-family: 'IBM Plex Mono'; font-weight: 600; text-align: center; margin: 8px 0 2px; }
        .inlineprob .expr { font-size: 46px; letter-spacing: 0.03em; }
        .inlineprob .expr .x { color: #5A82BE; }
        .inlineprob .ans { font-size: 40px; min-height: 50px; margin-top: 2px; }
        .inlineprob .ans.good { color: #2E7D4F; }
        .inlineprob .ans.bad { color: #D23B2E; }
        .inlineprob .ans.struck { text-decoration: line-through; text-decoration-thickness: 3px; }
        .inlineprob .ans .caret { display: inline-block; width: 2px; height: 34px; background: #5A82BE; vertical-align: -4px; animation: blink 1s step-end infinite; }

        .feedback { text-align: center; min-height: 26px; margin-bottom: 6px; }
        .feedback .big { font-weight: 800; font-size: 15px; }
        .feedback .big.good { color: #2E7D4F; }
        .feedback .big.bad { color: #D23B2E; }
        .feedback .time { font-size: 12px; color: #8A97AC; margin-top: 3px; }

        .walk { margin: 4px 0 10px; }
        .strategy { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
        .strategy .tag { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: #5A82BE; color: #fff; border-radius: 5px; padding: 3px 7px; white-space: nowrap; }
        .strategy .tname { font-size: 14px; font-weight: 800; }
        .walk .tip { font-size: 12.5px; color: #4A5A75; margin-bottom: 10px; line-height: 1.45; }
        .substeps { display: flex; flex-direction: column; gap: 6px; }
        .substep { display: flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono'; font-size: 16px; font-weight: 600; border: 1.5px solid #D8DFE9; border-radius: 10px; padding: 9px 12px; background: #FAFBF7; }
        .substep.done { border-color: #BFD9C8; background: #F2F8F3; }
        .substep.done.revealed { border-color: #E8C9C5; background: #FBF3F2; }
        .substep.current { border-color: #5A82BE; background: #fff; box-shadow: 0 0 0 3px rgba(90,130,190,0.15); }
        .substep.pending { opacity: 0.45; }
        .substep .stepno { font-family: 'Archivo'; font-size: 10px; font-weight: 800; color: #8A97AC; min-width: 14px; }
        .substep .expr { flex: 1; }
        .substep .result { font-weight: 700; }
        .substep.done .result { color: #2E7D4F; }
        .substep.done.revealed .result { color: #D23B2E; }
        .substep .subinput { color: #1B2A4A; min-width: 40px; text-align: right; }
        .substep .subinput .caret { display: inline-block; width: 2px; height: 16px; background: #5A82BE; vertical-align: -2px; animation: blink 1s step-end infinite; }
        .substep.flash-good { border-color: #2E7D4F; }
        .substep.flash-bad { animation: shake .3s; border-color: #D23B2E; }
        @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .stepnote { font-family: 'Archivo'; font-size: 11px; color: #8A97AC; font-weight: 500; margin: 2px 0 0 22px; }
        .walkfoot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .walkhint { font-size: 11.5px; color: #8A97AC; }
        .skip { background: none; border: none; font-family: 'Archivo'; font-size: 12px; font-weight: 700; color: #5A82BE; cursor: pointer; text-decoration: underline; padding: 4px; }
        .walkdone-msg { text-align: center; font-weight: 800; font-size: 16px; margin-top: 10px; }
        .walkdone-msg .eq { font-family: 'IBM Plex Mono'; color: #2E7D4F; }

        .dots { display: flex; gap: 5px; justify-content: center; margin-bottom: 4px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: #E4E9F1; border: 1.5px solid #D8DFE9; }
        .dot.hit { background: #2E7D4F; border-color: #2E7D4F; }
        .dot.miss { background: #F5C9C4; border-color: #D23B2E; }
        .dotlabel { text-align: center; font-size: 11px; color: #8A97AC; margin-bottom: 12px; }

        .pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .key { font-family: 'IBM Plex Mono'; font-size: 24px; font-weight: 600; padding: 14px 0; border-radius: 10px; border: 1.5px solid #D8DFE9; background: #FAFBF7; color: #1B2A4A; cursor: pointer; transition: transform .05s; }
        .key:active { transform: scale(0.96); background: #EEF2F7; }
        .key.action { background: #1B2A4A; color: #FAFBF7; border-color: #1B2A4A; font-size: 18px; font-family: 'Archivo'; font-weight: 700; }
        .key.back { font-size: 20px; }
        .nextbtn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: #1B2A4A; color: #FAFBF7; font-family: 'Archivo'; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 4px; }
        .ghostbtn { width: 100%; padding: 12px; border-radius: 10px; background: #fff; border: 1.5px solid #D8DFE9; color: #4A5A75; font-family: 'Archivo'; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .ghostbtn:active { background: #EEF2F7; }

        .stats { display: flex; gap: 8px; margin-top: 14px; }
        .stat { flex: 1; background: #fff; border: 1.5px solid #D8DFE9; border-radius: 10px; padding: 8px 6px; text-align: center; }
        .stat .v { font-family: 'IBM Plex Mono'; font-size: 18px; font-weight: 700; }
        .stat .l { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #8A97AC; font-weight: 700; }

        .levelup { text-align: center; padding: 18px 0 8px; }
        .levelup h2 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
        .levelup p { font-size: 14px; color: #4A5A75; margin-bottom: 16px; }

        .roundend h2 { font-size: 22px; font-weight: 800; text-align: center; margin: 4px 0 12px; }
        .bigstats { display: flex; gap: 8px; margin-bottom: 12px; }
        .bigstat { flex: 1; background: #F4F7FA; border-radius: 10px; padding: 10px 6px; text-align: center; }
        .bigstat .v { font-family: 'IBM Plex Mono'; font-size: 22px; font-weight: 700; }
        .bigstat .l { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #8A97AC; font-weight: 700; }
        .factlist { margin-bottom: 12px; }
        .factlist h3 { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8A97AC; font-weight: 800; margin-bottom: 5px; }
        .fact { display: flex; justify-content: space-between; font-family: 'IBM Plex Mono'; font-size: 14px; font-weight: 600; padding: 5px 10px; border-radius: 7px; margin-bottom: 4px; }
        .fact.slow { background: #FBF6EC; color: #8A6A1F; }
        .fact.wrongf { background: #FBF3F2; color: #D23B2E; }
        .fact.focus { background: #EFF3FA; color: #3B5A8C; }
        .reviewtag { display: inline-block; margin-left: 8px; vertical-align: 1px; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: #FBF6EC; color: #8A6A1F; border: 1px solid #E8D9AE; border-radius: 5px; padding: 2px 6px; }
        .history { margin-top: 10px; }
        .history h3 { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8A97AC; font-weight: 800; margin-bottom: 5px; }
        .histrow { display: flex; gap: 6px; flex-wrap: wrap; }
        .histchip { font-family: 'IBM Plex Mono'; font-size: 12px; font-weight: 700; background: #F4F7FA; border-radius: 6px; padding: 4px 8px; color: #1B2A4A; }
        .histchip.best { background: #F2F8F3; color: #2E7D4F; }
        .lifetime { font-family: 'IBM Plex Mono'; font-size: 12px; color: #4A5A75; margin-bottom: 6px; }
        .metricchips { display: flex; gap: 6px; margin-bottom: 8px; }
        .mchip { flex: 1; padding: 7px 4px; border-radius: 7px; border: 1.5px solid #D8DFE9; background: #fff; font-family: 'Archivo'; font-size: 11px; font-weight: 700; color: #8A97AC; cursor: pointer; }
        .mchip.active { background: #1B2A4A; color: #fff; border-color: #1B2A4A; }
        .heat { display: grid; grid-template-columns: 22px repeat(8, 1fr); gap: 2px; }
        .hcell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono'; font-size: 10px; font-weight: 600; border-radius: 4px; background: #F1F4F8; color: #8A97AC; min-width: 0; }
        .hcell.hhead { background: transparent; color: #8A97AC; font-weight: 700; font-size: 11px; }
        .heatcaption { font-size: 10.5px; color: #8A97AC; margin-top: 6px; line-height: 1.4; }
      `}</style>

      {/* Drawer */}
      <div className={`scrim ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <nav className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="dtitle">Mental math trainer</div>
        {groups.map((g) => (
          <div key={g}>
            <div className="dgroup">{g}</div>
            {EXERCISES.filter((e) => e.group === g).map((e) => (
              <button
                key={e.id}
                className={`ditem ${e.id === activeId ? "active" : ""}`}
                onClick={() => { setActiveId(e.id); setDrawerOpen(false); }}
              >
                <div className="dlabel">{e.label}</div>
                <div className="dsub">{e.sub}</div>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="frame">
        <div className="topbar">
          <button className="burger" onClick={() => setDrawerOpen(true)} aria-label="Open exercises menu">
            <span /><span /><span />
          </button>
          <div className="titleblock">
            <div className="eyebrow">{activeEx.group}</div>
            <h1>{activeEx.label}</h1>
          </div>
        </div>

        {EXERCISES.map((e) => (
          <div key={e.id} style={{ display: e.id === activeId ? "block" : "none" }}>
            {e.kind === "sprint"
              ? <Sprint active={e.id === activeId} config={e.config} />
              : <Ladder active={e.id === activeId} config={e.config} />}
          </div>
        ))}
      </div>
    </div>
  );
}
