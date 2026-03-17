"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import Checkbox from "@/components/Checkbox";
import Switch from "@/components/Switch";
import RadioGroup from "@/components/RadioGroup";
import ConstraintWeightSlider from "@/components/ConstraintWeightSlider";
import CSVImportDropzone from "@/components/CSVImportDropzone";
import Select from "@/components/Select";
import MultiSelect from "@/components/MultiSelect";
import Badge from "@/components/Badge";
import Tag from "@/components/Tag";
import DownloadIcon from "@/components/icons/Download";
import EyeIcon from "@/components/icons/Eye";
import CopyIcon from "@/components/icons/Copy";
import TrashIcon from "@/components/icons/Trash";
import GearIcon from "@/components/icons/Gear";
import XIcon from "@/components/icons/X";
import "./page.css";

export default function Home() {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState("students");
  const [constraintWeight, setConstraintWeight] = useState(65);
  const [csvFile, setCsvFile] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("cs");
  const [selectedCourses, setSelectedCourses] = useState(["math101", "phys101"]);
  const [tagList, setTagList] = useState([
    { id: 1, label: "Pending", variant: "warning" },
    { id: 2, label: "Active", variant: "success" },
    { id: 3, label: "Error", variant: "danger" },
  ]);
  const [toast, setToast] = useState({
    open: false,
    variant: "info",
    title: "",
    message: "",
    id: 0,
  });
  const dropdownRef = useRef(null);

  const showToast = (variant, title, message) => {
    setToast({
      open: true,
      variant,
      title,
      message,
      id: Date.now(),
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const components = [
    {
      id: "button",
      label: "Button Component",
      description: "Primary, Secondary, Ghost, Destructive",
    },
    {
      id: "modal",
      label: "Modal Component",
      description: "Base dialog with title, body and footer",
    },
    {
      id: "confirm-dialog",
      label: "ConfirmDialog Component",
      description: "Destructive action confirmation",
    },
    {
      id: "toast",
      label: "Toast Component",
      description: "Timed feedback notification (4 variants)",
    },
    {
      id: "form-controls",
      label: "Form Controls",
      description: "Checkbox, Switch, RadioGroup states",
    },
    {
      id: "constraint-weight-slider",
      label: "ConstraintWeightSlider",
      description: "Soft-constraint penalty strength",
    },
    {
      id: "csv-import-dropzone",
      label: "CSVImportDropzone",
      description: "CSV file drop area with validation",
    },
    {
      id: "select",
      label: "Select Component",
      description: "Single select dropdown with search and keyboard nav",
    },
    {
      id: "badge",
      label: "Badge Component",
      description: "5 semantic variants for status and labels",
    },
    {
      id: "tag",
      label: "Tag Component",
      description: "Removable pill for categorization and multi-select",
    },
    {
      id: "multiselect",
      label: "MultiSelect Component",
      description: "Tag-based multi-select with search and filtering",
    },
    // Add more components here as we create them
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">Schedula</h1>

          {/* Component Showcase Dropdown */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "components" ? null : "components",
                )
              }
              className="dropdown-trigger"
            >
              {openDropdown === "components" ? (
                <XIcon size={18} />
              ) : (
                <>
                  <GearIcon size={18} />
                  Components
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {openDropdown === "components" && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <p className="dropdown-header-label">UI Components</p>
                </div>
                <div className="dropdown-items">
                  {components.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => {
                        document
                          .getElementById(comp.id)
                          ?.scrollIntoView({ behavior: "smooth" });
                        setOpenDropdown(null);
                      }}
                      className="dropdown-item"
                    >
                      <p className="dropdown-item-title">{comp.label}</p>
                      <p className="dropdown-item-description">
                        {comp.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Component Library</h2>
            <p className="section-description">
              A curated collection of Schedula UI components built according to
              our design specification. Explore each component in its various
              states and configurations.
            </p>
          </div>
        </section>

        {/* Button Component Showcase */}
        <section id="button" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Button</h3>
            <p className="section-description">
              Versatile button component supporting 4 variants and multiple
              sizes.
            </p>
          </div>

          {/* Variants Grid */}
          <div className="section">
            {/* Primary Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Primary</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="primary" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Secondary</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="secondary" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Ghost</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="ghost" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Destructive Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Destructive</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="destructive" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* With Icons */}
            <div className="subsection">
              <h4 className="variant-title">With Icons</h4>
              <div className="card">
                <div className="flex-wrap">
                  <Button variant="primary" icon={<DownloadIcon size={18} />}>
                    Download
                  </Button>
                  <Button variant="secondary" icon={<EyeIcon size={18} />}>
                    View
                  </Button>
                  <Button variant="ghost" icon={<CopyIcon size={18} />}>
                    Copy Link
                  </Button>
                  <Button variant="destructive" icon={<TrashIcon size={18} />}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modal" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Modal</h3>
            <p className="section-description">
              Reusable base modal with backdrop click and Escape key support.
            </p>
          </div>

          <div className="card">
            <div className="flex-wrap">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Modal
              </Button>
            </div>
          </div>
        </section>

        <section id="confirm-dialog" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">ConfirmDialog</h3>
            <p className="section-description">
              Specialized destructive confirmation dialog built on top of Modal.
            </p>
          </div>

          <div className="card">
            <div className="flex-wrap">
              <Button variant="destructive" onClick={() => setIsConfirmOpen(true)}>
                Delete Schedule Draft
              </Button>
            </div>
          </div>
        </section>

        <section id="toast" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Toast</h3>
            <p className="section-description">
              Timed feedback notifications with four status variants.
            </p>
          </div>

          <div className="card">
            <div className="flex-wrap">
              <Button
                variant="primary"
                onClick={() =>
                  showToast("success", "Saved", "Schedule changes were saved successfully.")
                }
              >
                Success Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  showToast("info", "Heads up", "A new analytics report is available.")
                }
              >
                Info Toast
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  showToast("warning", "Warning", "2 sessions still need room assignment.")
                }
              >
                Warning Toast
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  showToast("error", "Error", "Unable to publish schedule right now.")
                }
              >
                Error Toast
              </Button>
            </div>
          </div>
        </section>

        <section id="form-controls" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Form Controls</h3>
            <p className="section-description">
              Checkbox, Switch, and RadioGroup controls with checked,
              unchecked, and disabled states.
            </p>
          </div>

          <div className="card">
            <div className="form-controls-grid">
              <div className="subsection">
                <h4 className="variant-title">Checkbox</h4>
                <div className="form-controls-list">
                  <Checkbox
                    label={`Interactive (${isCheckboxChecked ? "Checked" : "Unchecked"})`}
                    checked={isCheckboxChecked}
                    onChange={setIsCheckboxChecked}
                  />
                  <Checkbox label="Checked Disabled" defaultChecked disabled />
                  <Checkbox label="Unchecked Disabled" disabled />
                </div>
              </div>

              <div className="subsection">
                <h4 className="variant-title">Switch</h4>
                <div className="form-controls-list">
                  <Switch
                    label={`Interactive (${isSwitchOn ? "Checked" : "Unchecked"})`}
                    checked={isSwitchOn}
                    onChange={setIsSwitchOn}
                  />
                  <Switch label="Checked Disabled" defaultChecked disabled />
                  <Switch label="Unchecked Disabled" disabled />
                </div>
              </div>

              <div className="subsection">
                <h4 className="variant-title">RadioGroup</h4>
                <RadioGroup
                  legend="Schedule Visibility"
                  value={selectedAudience}
                  onChange={setSelectedAudience}
                  options={[
                    { value: "students", label: "Students (Checked)" },
                    { value: "staff", label: "Staff (Unchecked)" },
                    {
                      value: "guests",
                      label: "Guests (Disabled)",
                      disabled: true,
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="constraint-weight-slider" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">ConstraintWeightSlider</h3>
            <p className="section-description">
              Labeled slider for adjusting how strongly the solver penalizes a
              soft constraint.
            </p>
          </div>

          <div className="card">
            <div className="form-controls-list">
              <ConstraintWeightSlider
                label="Avoid Back-to-Back Lectures"
                value={constraintWeight}
                onChange={setConstraintWeight}
                description="Higher values increase penalties for consecutive sessions."
              />

              <ConstraintWeightSlider
                label="Keep Afternoon Slots Light"
                value={35}
                disabled
                description="Disabled preview state for read-only configurations."
              />
            </div>
          </div>
        </section>

        <section id="csv-import-dropzone" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">CSVImportDropzone</h3>
            <p className="section-description">
              File drop area for CSV imports. Validates file type and shows file
              info with drag-drop animations.
            </p>
          </div>

          <div className="card">
            <CSVImportDropzone
              onFileSelect={(file) => {
                setCsvFile(file);
                showToast(
                  "success",
                  "CSV Selected",
                  `${file.name} is ready to import.`
                );
              }}
            />
          </div>
        </section>

        {/* Select Component */}
        <section id="select" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Select</h3>
            <p className="section-description">
              Single select dropdown with keyboard navigation, search, and
              accessibility support.
            </p>
          </div>

          <div className="card">
            <div className="grid-2-cols">
              <Select
                label="Department"
                options={[
                  { value: "cs", label: "Computer Science" },
                  { value: "math", label: "Mathematics" },
                  { value: "phys", label: "Physics" },
                  { value: "chem", label: "Chemistry" },
                  { value: "bio", label: "Biology" },
                ]}
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                placeholder="Choose a department"
              />
              <Select
                label="Department (Disabled)"
                options={[
                  { value: "eng", label: "English" },
                  { value: "hist", label: "History" },
                ]}
                disabled
                placeholder="Select department"
              />
            </div>
          </div>
        </section>

        {/* MultiSelect Component */}
        <section id="multiselect" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">MultiSelect</h3>
            <p className="section-description">
              Tag-based multi-select with dynamic search filtering and
              removable tags.
            </p>
          </div>

          <div className="card">
            <div className="grid-2-cols">
              <MultiSelect
                label="Courses"
                options={[
                  { value: "math101", label: "Calculus I" },
                  { value: "math102", label: "Calculus II" },
                  { value: "phys101", label: "Physics I" },
                  { value: "phys102", label: "Physics II" },
                  { value: "chem101", label: "Chemistry I" },
                ]}
                value={selectedCourses}
                onChange={setSelectedCourses}
                placeholder="Select courses..."
              />
              <MultiSelect
                label="Instructors (Disabled)"
                options={[
                  { value: "prof1", label: "Dr. Smith" },
                  { value: "prof2", label: "Dr. Johnson" },
                ]}
                disabled
                placeholder="Select instructors"
              />
            </div>
          </div>
        </section>

        {/* Badge Component */}
        <section id="badge" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Badge</h3>
            <p className="section-description">
              Status badges with 5 semantic variants: default, info, success,
              warning, and danger.
            </p>
          </div>

          <div className="card">
            <div className="subsection">
              <h4 className="variant-title">All Variants (Medium)</h4>
              <div className="flex-wrap-gap" style={{ gap: "12px" }}>
                <Badge variant="default">Default</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
              </div>
            </div>

            <div className="subsection">
              <h4 className="variant-title">Small Size</h4>
              <div className="flex-wrap-gap" style={{ gap: "12px" }}>
                <Badge variant="default" size="sm">
                  Default
                </Badge>
                <Badge variant="info" size="sm">
                  Info
                </Badge>
                <Badge variant="success" size="sm">
                  Success
                </Badge>
                <Badge variant="warning" size="sm">
                  Warning
                </Badge>
                <Badge variant="danger" size="sm">
                  Danger
                </Badge>
              </div>
            </div>

            <div className="subsection">
              <h4 className="variant-title">Large Size</h4>
              <div className="flex-wrap-gap" style={{ gap: "12px" }}>
                <Badge variant="default" size="lg">
                  Default
                </Badge>
                <Badge variant="info" size="lg">
                  Info
                </Badge>
                <Badge variant="success" size="lg">
                  Success
                </Badge>
                <Badge variant="warning" size="lg">
                  Warning
                </Badge>
                <Badge variant="danger" size="lg">
                  Danger
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Tag Component */}
        <section id="tag" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Tag</h3>
            <p className="section-description">
              Removable pills for categorization, filtering, and multi-select
              scenarios. Click the × button to remove.
            </p>
          </div>

          <div className="card">
            <div className="subsection">
              <h4 className="variant-title">Removable Tags</h4>
              <div className="flex-wrap-gap" style={{ gap: "8px" }}>
                {tagList.map((tag) => (
                  <Tag
                    key={tag.id}
                    label={tag.label}
                    variant={tag.variant}
                    onRemove={() =>
                      setTagList(tagList.filter((t) => t.id !== tag.id))
                    }
                  />
                ))}
              </div>
              {tagList.length === 0 && (
                <p className="section-description">
                  All tags removed. (Page will reset on page refresh)
                </p>
              )}
            </div>

            <div className="subsection">
              <h4 className="variant-title">Non-removable Tags</h4>
              <div className="flex-wrap-gap" style={{ gap: "8px" }}>
                <Tag label="Default" variant="default" />
                <Tag label="Info" variant="info" />
                <Tag label="Success" variant="success" />
                <Tag label="Warning" variant="warning" />
                <Tag label="Danger" variant="danger" />
              </div>
            </div>

            <div className="subsection">
              <h4 className="variant-title">Disabled Tags</h4>
              <div className="flex-wrap-gap" style={{ gap: "8px" }}>
                <Tag
                  label="Disabled Default"
                  variant="default"
                  disabled
                  onRemove={() => {}}
                />
                <Tag
                  label="Disabled Info"
                  variant="info"
                  disabled
                  onRemove={() => {}}
                />
                <Tag
                  label="Disabled Success"
                  variant="success"
                  disabled
                  onRemove={() => {}}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Code Reference */}
        <section className="subsection">
          <h3 className="subsection-title">Usage</h3>
          <div className="code-block">
            <pre>{`import Button from '@/components/Button';
import Modal from '@/components/Modal';
import DownloadIcon from '@/components/icons/Download';
import RocketIcon from '@/components/icons/Rocket';

// Primary Button
<Button variant="primary">Click me</Button>

// Secondary Button
<Button variant="secondary">Secondary</Button>

// Ghost Button
<Button variant="ghost">Ghost</Button>

// Destructive Button
<Button variant="destructive">Delete</Button>

// With Vector Icon
<Button icon={<DownloadIcon size={18} />}>
  Download
</Button>

<Button icon={<RocketIcon size={18} />}>
  Launch
</Button>

// Different Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Disabled State
<Button disabled>Disabled</Button>

// Base Modal
const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="This action cannot be undone."
  footer={<Button onClick={() => setIsOpen(false)}>Close</Button>}
>
  Modal body content goes here.
</Modal>`}</pre>
          </div>
        </section>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Publish Schedule"
          description="Are you sure you want to publish this schedule snapshot?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="section-description">
            Publishing will make this schedule visible to staff and students.
          </p>
        </Modal>

        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            showToast("success", "Deleted", "Schedule draft has been permanently deleted.");
          }}
          title="Delete Schedule Draft"
          description="This will permanently remove this draft and all unsaved adjustments."
          confirmLabel="Delete Permanently"
        />

        <Toast
          key={toast.id}
          open={toast.open}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          duration={3200}
        />
      </main>
    </div>
  );
}
