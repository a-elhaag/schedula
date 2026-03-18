"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import "./styles.css";

const STEPS = [
  { id: 1, label: "Role" },
  { id: 2, label: "Academic Info" },
  { id: 3, label: "Preferences" },
];

const ROLE_OPTIONS = ["coordinator", "professor", "ta", "student"];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [transitionDirection, setTransitionDirection] = useState("forward");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    role: "student",
    institution: "",
    faculty: "",
    department: "",
    yearLevel: "",
    preferredStart: "08:30",
    preferredEnd: "15:30",
    notifications: true,
  });

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";
  const requiresYearLevel = formData.role === "student";

  const stepTitle = useMemo(() => {
    const step = STEPS.find((item) => item.id === currentStep);
    return step?.label ?? "Setup";
  }, [currentStep]);

  function updateField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(step) {
    if (step === 1 && !ROLE_OPTIONS.includes(formData.role)) {
      return "Please choose your role.";
    }

    if (step === 2) {
      if (formData.institution.trim().length < 2) {
        return "Please enter your institution name.";
      }

      if (formData.faculty.trim().length < 2) {
        return "Please enter your faculty name.";
      }

      if (formData.department.trim().length < 2) {
        return "Please enter your department name.";
      }

      if (requiresYearLevel && !formData.yearLevel) {
        return "Please select your year level.";
      }
    }

    if (step === 3 && formData.preferredStart >= formData.preferredEnd) {
      return "Preferred start time must be earlier than end time.";
    }

    return "";
  }

  function handleNext() {
    const error = validateStep(currentStep);
    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    setTransitionDirection("forward");
    setStatus("idle");
    setMessage("");
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }

  function handleBack() {
    setTransitionDirection("backward");
    setStatus("idle");
    setMessage("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const error = validateStep(3);
    if (error) {
      setStatus("error");
      setMessage(error);
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to save onboarding settings.");
      }

      setStatus("success");
      setMessage(data?.message ?? "Onboarding completed successfully.");

      setTimeout(() => {
        const redirectTo =
          typeof data?.redirectTo === "string" && data.redirectTo.startsWith("/")
            ? data.redirectTo
            : "/coordinator/setup";

        router.push(redirectTo);
      }, 500);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    }
  }

  return (
    <div className="page-container">
      <main className="onboarding-shell">
        <header className="onboarding-header">
          <p className="eyebrow">Welcome</p>
          <h1>Setup Your Workspace</h1>
          <p className="subtitle">Step {currentStep} of 3: {stepTitle}</p>
        </header>

        <section className="stepper" aria-label="Onboarding steps">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`step-pill ${currentStep === step.id ? "active" : ""} ${
                currentStep > step.id ? "done" : ""
              }`}
            >
              <span>{step.id}</span>
              {step.label}
            </div>
          ))}
        </section>

        <form className="onboarding-form" onSubmit={handleSubmit} noValidate>
          {currentStep === 1 ? (
            <div className={`panel panel-${transitionDirection}`} key={`step-1-${transitionDirection}`}>
              <label className="field-label" htmlFor="role">
                Select your role
              </label>
              <select
                id="role"
                className="input"
                value={formData.role}
                onChange={(event) => updateField("role", event.target.value)}
                disabled={isSubmitting || isSuccess}
              >
                <option value="student">Student</option>
                <option value="ta">Teaching Assistant</option>
                <option value="professor">Professor</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className={`panel panel-${transitionDirection}`} key={`step-2-${transitionDirection}`}>
              <div className="field-group">
                <label className="field-label" htmlFor="institution">
                  Institution
                </label>
                <input
                  id="institution"
                  className="input"
                  value={formData.institution}
                  onChange={(event) => updateField("institution", event.target.value)}
                  placeholder="Egyptian Chinese University"
                  disabled={isSubmitting || isSuccess}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="faculty">
                  Faculty
                </label>
                <input
                  id="faculty"
                  className="input"
                  value={formData.faculty}
                  onChange={(event) => updateField("faculty", event.target.value)}
                  placeholder="Faculty of Engineering"
                  disabled={isSubmitting || isSuccess}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  className="input"
                  value={formData.department}
                  onChange={(event) => updateField("department", event.target.value)}
                  placeholder="Software Engineering"
                  disabled={isSubmitting || isSuccess}
                />
              </div>

              {requiresYearLevel ? (
                <div className="field-group">
                  <label className="field-label" htmlFor="yearLevel">
                    Year level
                  </label>
                  <select
                    id="yearLevel"
                    className="input"
                    value={formData.yearLevel}
                    onChange={(event) => updateField("yearLevel", event.target.value)}
                    disabled={isSubmitting || isSuccess}
                  >
                    <option value="">Choose year level</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className={`panel panel-${transitionDirection}`} key={`step-3-${transitionDirection}`}>
              <div className="field-group">
                <label className="field-label" htmlFor="preferredStart">
                  Preferred start time
                </label>
                <input
                  id="preferredStart"
                  type="time"
                  className="input"
                  value={formData.preferredStart}
                  onChange={(event) => updateField("preferredStart", event.target.value)}
                  disabled={isSubmitting || isSuccess}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="preferredEnd">
                  Preferred end time
                </label>
                <input
                  id="preferredEnd"
                  type="time"
                  className="input"
                  value={formData.preferredEnd}
                  onChange={(event) => updateField("preferredEnd", event.target.value)}
                  disabled={isSubmitting || isSuccess}
                />
              </div>

              <label className="toggle-row" htmlFor="notifications">
                <input
                  id="notifications"
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(event) => updateField("notifications", event.target.checked)}
                  disabled={isSubmitting || isSuccess}
                />
                Email notifications for schedule updates
              </label>
            </div>
          ) : null}

          {isSuccess ? (
            <p className="feedback success" role="status">
              {message}
            </p>
          ) : null}

          {isError ? (
            <p className="feedback error" role="alert">
              {message}
            </p>
          ) : null}

          <div className="actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting || isSuccess}
            >
              Back
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={handleNext} disabled={isSubmitting || isSuccess}>
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || isSuccess} aria-busy={isSubmitting}>
                {isSubmitting ? "Saving..." : "Finish setup"}
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
