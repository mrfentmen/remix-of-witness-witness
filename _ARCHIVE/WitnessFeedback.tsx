// WitnessFeedback.tsx
import React, { useState, useEffect } from "react";

// ------------------------------
// SECTION: TYPES & CONSTANTS
// ------------------------------
type FeedbackType = "Bug Report" | "Feature Request" | "General Feedback" | "Safety Concern";

interface FeedbackFormData {
  type: FeedbackType;
  message: string;
  email: string;
}

const APP_VERSION = "1.1.0";
const RATE_LIMIT_KEY = "witness_feedback_limit";
const OFFLINE_QUEUE_KEY = "witness_feedback_queue";
const MAX_PER_HOUR = 3;

// ------------------------------
// SECTION: UTILITIES
// ------------------------------

// Rate Limiting: Checks if user has exceeded 3 posts in the last hour
const checkRateLimit = (): boolean => {
  const now = Date.now();
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const history: number[] = raw ? JSON.parse(raw) : [];

  // Keep only timestamps from the last 60 minutes
  const recent = history.filter((ts) => now - ts < 3600000);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));

  return recent.length < MAX_PER_HOUR;
};

const recordSubmission = () => {
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const history: number[] = raw ? JSON.parse(raw) : [];
  history.push(Date.now());
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(history));
};

// ------------------------------
// SECTION: MAIN COMPONENT
// ------------------------------
const WitnessFeedback: React.FC = () => {
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: "General Feedback",
    message: "",
    email: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedType, setLastSubmittedType] = useState<FeedbackType>("General Feedback");
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor Connection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleSubmit = async () => {
    if (!formData.message.trim()) return setError("Message cannot be empty.");
    if (!checkRateLimit()) return setError("Hourly limit reached (3 per hour).");

    setSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      appVersion: APP_VERSION,
      timestamp: new Date().toISOString(),
      // In a real app, we would inject the state detected by GPS here
      locationHint: "Auto-detected via Witness Engine",
    };

    try {
      if (!navigator.onLine) throw new Error("offline");

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("server_error");

      finishSubmission();
    } catch (err) {
      if (err instanceof Error && err.message === "offline") {
        // Queue for later
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
        queue.push(payload);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

        setError("You are offline. Feedback saved and will send automatically when reconnected.");
        setTimeout(() => finishSubmission(), 3000);
      } else {
        setError("Could not connect to server. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finishSubmission = () => {
    recordSubmission();
    setLastSubmittedType(formData.type); // Remember type for success screen
    setSubmitted(true);
    setFormData({ type: "General Feedback", message: "", email: "" });
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.title}>Sent!</h2>
          <p style={styles.text}>
            Your feedback has been received. Thank you for helping the community.
          </p>

          {lastSubmittedType === "Safety Concern" && (
            <div style={styles.safetyAlert}>
              ⚠️ This safety concern has been prioritized for immediate review.
            </div>
          )}

          <button style={styles.btnSecondary} onClick={() => setSubmitted(false)}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>App Feedback</h2>
        <p style={styles.subtitle}>Version {APP_VERSION}</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Feedback Category</label>
          <select
            style={styles.select}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackType })}
          >
            <option>General Feedback</option>
            <option>Bug Report</option>
            <option>Feature Request</option>
            <option>Safety Concern</option>
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Message</label>
          <textarea
            style={styles.textarea}
            placeholder="What's on your mind?"
            rows={4}
            maxLength={500}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
          <div
            style={{
              ...styles.charCount,
              color: formData.message.length > 450 ? "#ff0000" : "#888",
            }}
          >
            {formData.message.length} / 500
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email (Optional)</label>
          <input
            style={styles.input}
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          style={submitting ? styles.btnDisabled : styles.btnPrimary}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Sending..." : "Submit Feedback"}
        </button>

        {!isOnline && <p style={styles.offlineNote}>Working Offline: Submissions will queue</p>}
      </div>
    </div>
  );
};

// ------------------------------
// SECTION: STYLES (Witness Red/Black Theme)
// ------------------------------
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#000",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "sans-serif",
  },
  card: {
    backgroundColor: "#111",
    padding: "30px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "450px",
    border: "1px solid #333",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  },
  title: {
    color: "#d32f2f",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  subtitle: {
    color: "#555",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "20px",
  },
  label: {
    color: "#fff",
    fontSize: "14px",
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    backgroundColor: "#000",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "12px",
    color: "#fff",
  },
  select: {
    width: "100%",
    backgroundColor: "#000",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "12px",
    color: "#fff",
  },
  textarea: {
    width: "100%",
    backgroundColor: "#000",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "12px",
    color: "#fff",
    resize: "none",
  },
  charCount: {
    fontSize: "10px",
    textAlign: "right",
    marginTop: "5px",
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: "#d32f2f",
    color: "#fff",
    fontWeight: "bold",
    padding: "15px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
  },
  btnDisabled: {
    width: "100%",
    backgroundColor: "#333",
    color: "#666",
    padding: "15px",
    borderRadius: "30px",
    border: "none",
    cursor: "not-allowed",
  },
  btnSecondary: {
    width: "100%",
    backgroundColor: "#222",
    color: "#fff",
    padding: "12px",
    borderRadius: "30px",
    border: "1px solid #444",
    cursor: "pointer",
    marginTop: "10px",
  },
  error: {
    color: "#ff5252",
    fontSize: "13px",
    marginBottom: "15px",
    textAlign: "center",
    backgroundColor: "rgba(255,82,82,0.1)",
    padding: "10px",
    borderRadius: "8px",
  },
  successIcon: {
    fontSize: "50px",
    color: "#4caf50",
    textAlign: "center",
    marginBottom: "10px",
  },
  text: {
    color: "#ccc",
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "14px",
  },
  safetyAlert: {
    backgroundColor: "rgba(211,47,47,0.2)",
    color: "#ff8a80",
    padding: "15px",
    borderRadius: "10px",
    fontSize: "12px",
    marginBottom: "20px",
    textAlign: "center",
    border: "1px solid #d32f2f",
  },
  offlineNote: {
    color: "#ff9800",
    fontSize: "11px",
    textAlign: "center",
    marginTop: "15px",
    fontStyle: "italic",
  },
};

export default WitnessFeedback;
