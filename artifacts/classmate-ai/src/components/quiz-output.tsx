import { useState } from "react";
import { Brain, ChevronRight, RotateCcw, X, CheckCircle2, XCircle, Lightbulb, Trophy } from "lucide-react";

export interface QuizQuestion {
  type: "mcq" | "short";
  question: string;
  options?: string[];
  answer: number | string;
  explanation: string;
}

interface QuizOutputProps {
  questions: QuizQuestion[];
  onClose: () => void;
  onRetry?: () => void;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">{current}/{total}</span>
    </div>
  );
}

export function QuizOutput({ questions, onClose, onRetry }: QuizOutputProps) {
  const [current, setCurrent] = useState(0);
  const [mcqSelected, setMcqSelected] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [shortInput, setShortInput] = useState<string[]>(Array(questions.length).fill(""));
  const [revealed, setRevealed] = useState<boolean[]>(Array(questions.length).fill(false));
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isRevealed = revealed[current];
  const isMcq = q.type === "mcq";
  const selected = mcqSelected[current];

  const revealCurrent = () => {
    const next = [...revealed];
    next[current] = true;
    setRevealed(next);
  };

  const selectOption = (i: number) => {
    if (isRevealed) return;
    const next = [...mcqSelected];
    next[current] = i;
    setMcqSelected(next);
    const nextRevealed = [...revealed];
    nextRevealed[current] = true;
    setRevealed(nextRevealed);
  };

  const goNext = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setCurrent(0);
    setMcqSelected(Array(questions.length).fill(null));
    setShortInput(Array(questions.length).fill(""));
    setRevealed(Array(questions.length).fill(false));
    setDone(false);
  };

  const score = questions.reduce((acc, q, i) => {
    if (q.type === "mcq" && mcqSelected[i] === q.answer) return acc + 1;
    return acc;
  }, 0);
  const mcqTotal = questions.filter(q => q.type === "mcq").length;

  const HEADER_STYLE = {
    background: "hsl(256 90% 67% / 0.08)",
    borderBottom: "1px solid hsl(256 90% 67% / 0.2)",
  };

  if (done) {
    const pct = Math.round((score / mcqTotal) * 100);
    const strong = pct >= 80;

    return (
      <div
        className="rounded-xl overflow-hidden animate-in fade-in duration-200"
        style={{ border: "1px solid hsl(256 90% 67% / 0.25)", background: "hsl(225 14% 11%)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={HEADER_STYLE}>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Quiz results</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <div className={`text-4xl font-black ${strong ? "text-primary" : pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {score}/{mcqTotal}
            </div>
            <p className="text-sm text-muted-foreground">
              {strong ? "Strong work — you've got this material." : pct >= 50 ? "Good start. A bit more review and you'll nail it." : "Let's revisit this — a few concepts need more attention."}
            </p>
            {strong && <Trophy className="w-8 h-8 text-amber-400 mx-auto" />}
          </div>

          <div className="space-y-2">
            {questions.map((q, i) => {
              const correct = q.type === "mcq" && mcqSelected[i] === q.answer;
              const wrong = q.type === "mcq" && mcqSelected[i] !== null && mcqSelected[i] !== q.answer;
              return (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm border ${
                  correct
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : wrong
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-border/40 bg-muted/30"
                }`}>
                  {correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : wrong
                    ? <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    : <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{q.question}</p>
                    {wrong && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        Correct: {q.type === "mcq" && q.options ? q.options[q.answer as number] : q.answer}
                      </p>
                    )}
                    {q.type === "short" && (
                      <p className="text-[11px] text-amber-400 mt-0.5">Open answer — check your response</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)" }}
              >
                <Brain className="w-3.5 h-3.5" /> New quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden animate-in fade-in duration-200"
      style={{ border: "1px solid hsl(256 90% 67% / 0.25)", background: "hsl(225 14% 11%)" }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={HEADER_STYLE}>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Quiz</span>
          <span
            className="text-[10px] font-medium border px-1.5 py-0.5 rounded-full"
            style={{ color: "hsl(256 90% 67% / 0.8)", borderColor: "hsl(256 90% 67% / 0.25)", background: "hsl(256 90% 67% / 0.08)" }}
          >
            {isMcq ? "Multiple choice" : "Short answer"}
          </span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <ProgressBar current={current + 1} total={questions.length} />

        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>

        {isMcq ? (
          <div className="space-y-2">
            {q.options!.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.answer;
              let borderColor = "hsl(225 12% 22%)";
              let bg = "hsl(225 12% 14%)";
              let textColor = "hsl(220 20% 75%)";

              if (isRevealed) {
                if (isCorrect) { borderColor = "#4ade80"; bg = "rgba(74,222,128,0.08)"; textColor = "#86efac"; }
                else if (isSelected && !isCorrect) { borderColor = "#f87171"; bg = "rgba(248,113,113,0.08)"; textColor = "#fca5a5"; }
                else { borderColor = "hsl(225 12% 18%)"; textColor = "hsl(220 10% 40%)"; }
              } else if (isSelected) {
                borderColor = "#7c5cfc"; bg = "hsl(256 90% 67% / 0.12)"; textColor = "#c4b5fd";
              }

              return (
                <button
                  key={i}
                  onClick={() => selectOption(i)}
                  disabled={isRevealed}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all disabled:cursor-default"
                  style={{ borderColor, background: bg, color: textColor }}
                >
                  <span
                    className="w-5 h-5 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0"
                    style={{
                      borderColor: isRevealed && isCorrect ? "#4ade80" : isRevealed && isSelected ? "#f87171" : "hsl(225 12% 30%)",
                      background: "hsl(225 14% 11%)",
                      color: isRevealed && isCorrect ? "#4ade80" : isRevealed && isSelected ? "#f87171" : "hsl(220 10% 50%)",
                    }}
                  >
                    {["A","B","C","D"][i]}
                  </span>
                  {opt}
                  {isRevealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />}
                  {isRevealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={shortInput[current]}
              onChange={e => {
                const next = [...shortInput];
                next[current] = e.target.value;
                setShortInput(next);
              }}
              placeholder="Type your answer here…"
              disabled={isRevealed}
              className="w-full text-sm bg-muted/20 border border-border/60 rounded-lg px-3 py-2.5 resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
            {!isRevealed && (
              <button
                onClick={revealCurrent}
                className="w-full px-3 py-2 rounded-lg text-primary text-xs font-semibold transition-all"
                style={{ background: "hsl(256 90% 67% / 0.1)", border: "1px solid hsl(256 90% 67% / 0.25)" }}
              >
                See model answer
              </button>
            )}
          </div>
        )}

        {isRevealed && (
          <div
            className="rounded-lg px-3 py-2.5 space-y-1 animate-in fade-in duration-150"
            style={{ background: "hsl(45 90% 50% / 0.08)", border: "1px solid hsl(45 90% 50% / 0.2)" }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
              <Lightbulb className="w-3.5 h-3.5" /> Explanation
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">{q.explanation}</p>
            {q.type === "short" && (
              <p className="text-xs text-amber-300 font-medium mt-1 pt-1 border-t border-amber-500/20">
                Model answer: {q.answer as string}
              </p>
            )}
          </div>
        )}

        {isRevealed && (
          <button
            onClick={goNext}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)" }}
          >
            {current < questions.length - 1 ? (
              <><ChevronRight className="w-4 h-4" /> Next question</>
            ) : (
              <><Trophy className="w-4 h-4" /> See results</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
