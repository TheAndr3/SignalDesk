import {
  FC,
  FormEvent,
  KeyboardEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CaseDto, CasePriority } from '@signaldesk/shared';
import { AlertCircle, Plus, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface NewCaseDialogProps {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onCreated: (caseItem: CaseDto) => void;
  onRequestClose: () => void;
}

function errorMessage(error: unknown): string {
  const message = (error as any)?.error?.message;
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  return typeof message === 'string'
    ? message
    : 'Unable to create the Case. Please try again.';
}

export const NewCaseDialog: FC<NewCaseDialogProps> = ({
  triggerRef,
  onCreated,
  onRequestClose,
}) => {
  const { showSuccess } = useToast();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CasePriority>(CasePriority.MEDIUM);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    priority !== CasePriority.MEDIUM;

  useEffect(() => {
    titleInputRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, [triggerRef]);

  const requestClose = () => {
    if (isSubmitting) return;
    if (isDirty && !window.confirm('Discard unsaved Case?')) return;
    onRequestClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTitleError(null);
    setPriorityError(null);
    setFormError(null);

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setTitleError('Title is required.');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<CaseDto>('/cases', {
        method: 'POST',
        body: JSON.stringify({
          title: normalizedTitle,
          description: description.trim() || undefined,
          priority,
        }),
      });
      showSuccess(`${created.formattedReference} created successfully.`);
      onCreated(created);
    } catch (error) {
      const message = errorMessage(error);
      if (/title/i.test(message)) {
        setTitleError(message);
      } else if (/priority/i.test(message)) {
        setPriorityError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-case-title"
        aria-describedby="new-case-description"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <div>
            <h2 id="new-case-title">New Case</h2>
            <p id="new-case-description">Capture customer work for your Workspace.</p>
          </div>
          <button
            type="button"
            className="panel-close-button"
            aria-label="Close new Case dialog"
            onClick={requestClose}
            disabled={isSubmitting}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="new-case-form" onSubmit={handleSubmit}>
          {formError && (
            <div className="action-error-banner" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="case-title">
              Title *
            </label>
            <input
              ref={titleInputRef}
              id="case-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) setTitleError(null);
              }}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? 'case-title-error' : undefined}
              maxLength={255}
              className="form-input"
              placeholder="Summarize the customer problem"
            />
            {titleError && (
              <span id="case-title-error" className="form-error" role="alert">
                {titleError}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="case-description">
              Description
            </label>
            <textarea
              id="case-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="form-textarea"
              placeholder="Add context, customer impact, or relevant details"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="case-priority">
              Priority
            </label>
            <select
              id="case-priority"
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value as CasePriority);
                if (priorityError) setPriorityError(null);
              }}
              aria-invalid={!!priorityError}
              aria-describedby={priorityError ? 'case-priority-error' : undefined}
              className="form-input"
            >
              <option value={CasePriority.LOW}>Low</option>
              <option value={CasePriority.MEDIUM}>Medium</option>
              <option value={CasePriority.HIGH}>High</option>
              <option value={CasePriority.URGENT}>Urgent</option>
            </select>
            {priorityError && (
              <span id="case-priority-error" className="form-error" role="alert">
                {priorityError}
              </span>
            )}
          </div>

          <div className="new-case-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={requestClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="action-button action-create-button" disabled={isSubmitting}>
              <Plus size={16} aria-hidden="true" />
              <span>{isSubmitting ? 'Creating...' : 'Create Case'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
