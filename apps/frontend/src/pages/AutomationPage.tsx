import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  automationApi,
  type AutomationRule,
  type AutomationCondition,
  type AutomationAction,
  type AutomationLog,
} from '@/api/automation';

const TRIGGER_TYPES = [
  { value: 'cardMoved', label: 'Card Moved' },
  { value: 'cardCreated', label: 'Card Created' },
  { value: 'labelAdded', label: 'Label Added' },
];

const CONDITION_FIELDS = [
  { value: 'priority', label: 'Priority' },
  { value: 'column', label: 'Column' },
  { value: 'label', label: 'Label' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
];

const ACTION_TYPES = [
  { value: 'moveCard', label: 'Move Card' },
  { value: 'setLabel', label: 'Set Label' },
  { value: 'setAssignee', label: 'Set Assignee' },
  { value: 'setPriority', label: 'Set Priority' },
  { value: 'addComment', label: 'Add Comment' },
  { value: 'setDueDate', label: 'Set Due Date' },
  { value: 'archive', label: 'Archive Card' },
];

interface RuleFormState {
  name: string;
  triggerType: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

function getEmptyForm(): RuleFormState {
  return {
    name: '',
    triggerType: 'cardMoved',
    conditions: [],
    actions: [],
  };
}

export default function AutomationPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(getEmptyForm());
  const [logsRuleId, setLogsRuleId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automations', boardId],
    queryFn: () => automationApi.list(boardId!),
    enabled: !!boardId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AutomationRule>) => automationApi.create(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', boardId] });
      setShowForm(false);
      setForm(getEmptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AutomationRule> }) =>
      automationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', boardId] });
      setEditingRule(null);
      setShowForm(false);
      setForm(getEmptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', boardId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => automationApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', boardId] });
    },
  });

  const handleOpenCreate = () => {
    setEditingRule(null);
    setForm(getEmptyForm());
    setShowForm(true);
  };

  const handleOpenEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      triggerType: rule.trigger.type,
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<AutomationRule> = {
      name: form.name,
      trigger: { type: form.triggerType },
      conditions: form.conditions,
      actions: form.actions,
    };
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addCondition = () => {
    setForm((f) => ({
      ...f,
      conditions: [...f.conditions, { field: 'priority', operator: 'equals', value: '' }],
    }));
  };

  const removeCondition = (index: number) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index: number, key: keyof AutomationCondition, value: string) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    }));
  };

  const addAction = () => {
    setForm((f) => ({
      ...f,
      actions: [...f.actions, { type: 'moveCard' }],
    }));
  };

  const removeAction = (index: number) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.filter((_, i) => i !== index),
    }));
  };

  const updateActionType = (index: number, type: string) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, i) => (i === index ? { type } : a)),
    }));
  };

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['automation-logs', logsRuleId],
    queryFn: () => automationApi.getLogs(logsRuleId!),
    enabled: !!logsRuleId,
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/boards/${boardId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to board
        </Link>
        <h2 className="text-xl font-semibold text-gray-900 mt-2">Automation Rules</h2>
        <p className="text-sm text-gray-500 mt-1">
          Automate repetitive tasks based on board events.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          + Create Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingRule ? 'Edit Rule' : 'New Automation Rule'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Move high priority cards to top"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Conditions</label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:border-blue-500"
                >
                  + Add Condition
                </button>
              </div>
              {form.conditions.length === 0 && (
                <p className="text-xs text-gray-400 italic">No conditions — rule applies to all events.</p>
              )}
              <div className="space-y-2">
                {form.conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, 'field', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CONDITION_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={String(cond.value ?? '')}
                      onChange={(e) => updateCondition(i, 'value', e.target.value)}
                      placeholder="Value..."
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="text-red-400 hover:text-red-600 text-sm px-1"
                      title="Remove condition"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Actions</label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:border-blue-500"
                >
                  + Add Action
                </button>
              </div>
              {form.actions.length === 0 && (
                <p className="text-xs text-gray-400 italic">No actions added yet.</p>
              )}
              <div className="space-y-2">
                {form.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                    <select
                      value={action.type}
                      onChange={(e) => updateActionType(i, e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAction(i)}
                      className="text-red-400 hover:text-red-600 text-sm px-1"
                      title="Remove action"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {isPending ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRule(null);
                  setForm(getEmptyForm());
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading automation rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-base">No automation rules yet.</p>
          <p className="text-sm mt-1">Create a rule to automate repetitive tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id}>
              <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{rule.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rule.isEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {rule.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trigger: {TRIGGER_TYPES.find((t) => t.value === rule.trigger.type)?.label ?? rule.trigger.type}
                    {rule.conditions.length > 0 && ` | ${rule.conditions.length} condition(s)`}
                    {rule.actions.length > 0 && ` | ${rule.actions.length} action(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setLogsRuleId(logsRuleId === rule.id ? null : rule.id)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      logsRuleId === rule.id
                        ? 'border-blue-400 text-blue-700 bg-blue-50'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(rule.id)}
                    disabled={toggleMutation.isPending}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
                      rule.isEnabled
                        ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {rule.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete rule "${rule.name}"?`)) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Logs panel */}
              {logsRuleId === rule.id && (
                <div className="bg-gray-50 border border-t-0 rounded-b-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-gray-700">
                      Execution Logs
                      <span className="ml-1 font-normal text-gray-400">(last 50)</span>
                    </h5>
                    <button
                      onClick={() => setLogsRuleId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>
                  {logsLoading ? (
                    <p className="text-xs text-gray-400">Loading logs...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No logs yet for this rule.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {logs.map((log: AutomationLog) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 py-1.5 px-2 bg-white rounded border border-gray-200 text-xs"
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-gray-500 flex-shrink-0">
                            {new Date(log.createdAt).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          {log.cardId && (
                            <span className="text-gray-500 flex-shrink-0">
                              Card: {log.cardId.slice(0, 8)}...
                            </span>
                          )}
                          {log.details != null && typeof log.details === 'object' ? (
                            <span className="text-gray-400 truncate">
                              {String(JSON.stringify(log.details)).slice(0, 80)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
