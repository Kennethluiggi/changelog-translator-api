'use client';

import { useEffect, useMemo, useState } from 'react';

type DemoStage = 'incoming' | 'processing' | 'result';

const processingMessages = [
  'Analyzing change with AI',
  'Detecting risk signals',
  'Identifying impacted partners',
  'Generating recommended actions',
];


export function HomeHeroDemo() {
  const [stage, setStage] = useState<DemoStage>('incoming');
  const [processingIndex, setProcessingIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
    if (isPaused) return;

    const stageTimer = window.setTimeout(() => {
        setStage('processing');
    }, 2200);

    return () => window.clearTimeout(stageTimer);
    }, [isPaused]);

    useEffect(() => {
    if (stage !== 'processing' || isPaused) return;

    const interval = window.setInterval(() => {
        setProcessingIndex((prev) => {
        if (prev >= processingMessages.length - 1) {
            window.clearInterval(interval);

            window.setTimeout(() => {
            setStage('result');
            }, 1400);

            return prev;
        }

        return prev + 1;
        });
    }, 1450);

    return () => window.clearInterval(interval);
    }, [stage]);

    useEffect(() => {
    if (stage !== 'result' || isPaused) return;

    const resetTimer = window.setTimeout(() => {
        setStage('incoming');
        setProcessingIndex(0);

        window.setTimeout(() => {
        setStage('processing');
        }, 1800);
    }, 8200);

    return () => window.clearTimeout(resetTimer);
    }, [stage]);

  const visibleProcessing = useMemo(
    () => processingMessages.slice(0, processingIndex + 1),
    [processingIndex]
  );

  return (
    <div className="home-v2-demo-shell">
      <div className="home-v2-demo-glow home-v2-demo-glow-a" />
      <div className="home-v2-demo-glow home-v2-demo-glow-b" />

      <div
        className="home-v2-demo-card"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        >
        <div className="home-v2-demo-header">
          <span className="home-v2-demo-pill">Live product demo</span>
          <button
            type="button"
            className="home-v2-demo-replay"
            onClick={() => {
              setStage('incoming');
              setProcessingIndex(0);
              window.setTimeout(() => setStage('processing'), 900);
            }}
          >
            Replay
          </button>
        </div>

        <div className="home-v2-demo-content">
          <div className="home-v2-demo-window">
            <div className="home-v2-demo-window-top">
              <span />
              <span />
              <span />
            </div>

            {stage === 'incoming' && (
              <div className="home-v2-demo-state fade-in">
                <p className="home-v2-demo-label">Incoming change</p>
                <div className="home-v2-demo-message">
                  <strong>Authentication update</strong>
                  <p>Legacy OAuth scope deprecated</p>
                  <p>Token rotation now required</p>
                </div>
              </div>
            )}

            {stage === 'processing' && (
              <div className="home-v2-demo-state fade-in">
                <p className="home-v2-demo-label">AI-powered analysis</p>

                <div className="home-v2-demo-processing-list">
                  {visibleProcessing.map((message, index) => (
                    <div key={message} className="home-v2-demo-processing-item">
                      <span className="home-v2-demo-processing-dot" />
                      <span>{message}</span>
                      {index === visibleProcessing.length - 1 && (
                        <span className="home-v2-demo-processing-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === 'result' && (
              <div className="home-v2-demo-state fade-in">
                <p className="home-v2-demo-label">Executive-ready output</p>

                <div className="home-v2-impact-banner">
                  <span className="home-v2-impact-dot" />
                  <span>High-risk change detected</span>
                </div>

                <div className="home-v2-result-grid">
                  <div className="home-v2-result-panel">
                    <p className="home-v2-result-title">Who is affected</p>
                    <ul>
                      <li>Northstar Bank</li>
                      <li>Apex Payments</li>
                      <li>Delta Finance</li>
                    </ul>
                  </div>

                  <div className="home-v2-result-panel">
                    <p className="home-v2-result-title">Why it matters</p>
                    <p>
                      Partners using legacy auth scopes will experience authentication
                      failures after release.
                    </p>
                  </div>
                </div>

                <div className="home-v2-actions-panel">
                  <p className="home-v2-result-title">Recommended actions</p>
                  <ul>
                    <li>Notify affected partners before release</li>
                    <li>Provide token migration guidance</li>
                    <li>Prepare support for inbound issues</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="home-v2-demo-summary">
            <div className="home-v2-summary-chip">Breaking change</div>
            <div className="home-v2-summary-chip">3 partners impacted</div>
            <div className="home-v2-summary-chip">Actions generated</div>
          </div>
        </div>
      </div>
    </div>
  );
}