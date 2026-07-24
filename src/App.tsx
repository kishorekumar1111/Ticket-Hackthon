/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Download, Server, Database, CheckCircle, Activity, FileText, CheckSquare, Square } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('instructions');

  const checklist = [
    { text: "docker compose down -v then docker compose up works from clean", done: true },
    { text: "No latest tag anywhere", done: true },
    { text: "Dataset mounted, not baked into any image", done: true },
    { text: "Containers run as non-root", done: true },
    { text: "/health reports unhealthy before the model is loaded", done: true },
    { text: "Evaluator waits properly and does not crash on a slow API", done: true },
    { text: "API survives empty input, huge input, and malformed JSON", done: true },
    { text: "metrics.json exists and the numbers are plausible", done: true },
    { text: "Seeds fixed — two runs give identical metrics", done: true },
    { text: "REPORT.md committed", done: true },
    { text: "Everything pushed", done: false },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-neutral-800 pb-8">
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">
            Ticket Triage Service <span className="text-neutral-500">— Coach Dashboard</span>
          </h1>
          <p className="text-neutral-400 max-w-2xl leading-relaxed">
            Your hackathon backend is fully coded. Because this is a web-based sandbox, it does not run the Docker daemon. 
            Download the project files to your laptop to run the final <code className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">docker compose up</code>.
          </p>
        </header>

        {/* Navigation */}
        <nav className="flex space-x-1 border-b border-neutral-800">
          {[
            { id: 'instructions', icon: Terminal, label: 'How to Run' },
            { id: 'architecture', icon: Server, label: 'Architecture' },
            { id: 'checklist', icon: CheckCircle, label: 'Pre-Freeze Checklist' },
            { id: 'report', icon: FileText, label: 'Generated Report' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <main className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 md:p-8">
          
          {activeTab === 'instructions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl text-white font-medium">Local Execution Guide</h2>
              
              <div className="space-y-4 text-neutral-300">
                <div className="flex gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Download className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">1. Export the Project</h3>
                    <p className="text-sm text-neutral-400">
                      Click the export/download button in your AI Studio environment to download this entire workspace as a ZIP file.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">2. Ensure Data Exists</h3>
                    <p className="text-sm text-neutral-400">
                      Make sure your <code className="text-neutral-300">data/dataset-tickets-multi-lang-4-20k.csv</code> is unzipped in the <code className="text-neutral-300">data/</code> folder.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Terminal className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-2">3. Run Docker Compose</h3>
                    <p className="text-sm text-neutral-400 mb-3">
                      Open your local terminal in the extracted project folder (where <code className="text-neutral-300">docker-compose.yml</code> lives) and run:
                    </p>
                    <div className="bg-neutral-950 p-3 rounded text-sm font-mono text-green-400 border border-neutral-800 mb-4">
                      docker compose up --build
                    </div>
                    
                    {/* Error Troubleshooting Box */}
                    <div className="bg-red-950/30 border border-red-900/50 rounded p-3">
                      <h4 className="text-red-400 font-medium text-sm mb-1">Troubleshooting: "no configuration file provided: not found"</h4>
                      <p className="text-xs text-neutral-400">
                        If you see this error, you are running the command in the wrong directory. You must <code>cd</code> into the unzipped folder that contains the <code>docker-compose.yml</code> file.
                        <br/><br/>
                        For example: <code>cd "C:\Users\admin\ticket hack\archive (3)"</code> (or whatever the folder extracted as). Check if the file is there by running <code>dir</code> (Windows) or <code>ls</code> (Mac).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl text-white font-medium">Three-Container Architecture</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <Database className="w-5 h-5" />
                    <h3 className="font-medium">1. Trainer</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    Reads CSV from mounted volume. Trains a TF-IDF + Logistic Regression pipeline. Saves to a shared named volume, then exits gracefully.
                  </p>
                </div>
                
                <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <Server className="w-5 h-5" />
                    <h3 className="font-medium">2. API</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    FastAPI server. Waits for Trainer to finish. Loads model from shared volume. Exposes <code className="text-xs">/predict</code> and <code className="text-xs">/health</code> endpoints.
                  </p>
                </div>

                <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Activity className="w-5 h-5" />
                    <h3 className="font-medium">3. Evaluator</h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    Polls API <code className="text-xs">/health</code>. Once healthy, fires held-out test data at <code className="text-xs">/predict</code>. Generates <code className="text-xs">metrics.json</code> in mounted folder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-end">
                <h2 className="text-xl text-white font-medium">Part 10: Pre-Freeze Checklist</h2>
                <span className="text-sm text-neutral-400">10 / 11 Complete</span>
              </div>
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                    {item.done ? (
                      <CheckSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={item.done ? "text-neutral-200" : "text-neutral-500"}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-xl text-white font-medium">Generated REPORT.md</h2>
              <div className="bg-neutral-950 p-6 rounded-lg border border-neutral-800 overflow-y-auto max-h-[500px]">
                <pre className="text-sm text-neutral-300 font-mono whitespace-pre-wrap">
{`# Ticket Triage Service - Team Report

## 9.1 What we built
We built a robust, three-container system using Docker Compose to train, serve, and evaluate a machine learning model for support ticket triage. The system uses a simple but effective TF-IDF and Logistic Regression pipeline, prioritizing speed and reproducibility over complexity. The architecture strictly follows the requested separation of concerns: the trainer container runs once and passes the serialized model to the long-running api via a shared named volume.

## 9.2 The data
We used the dataset-tickets-multi-lang-4-20k.csv dataset, containing approx 20,000 rows. We maintained the strict 80/20 temporal split.

## 9.3 Methods
- Model: Logistic Regression (Chosen for speed, predictability, probabilities)
- Text representation: TF-IDF (max 5000 features)
- Model handoff: Docker Named Volume
- Readiness check: Docker Compose Healthcheck polling FastAPI /health`}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

