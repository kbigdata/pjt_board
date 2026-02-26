import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  automationApi,
  type AutomationRule,
  type AutomationCondition,
  type AutomationAction,
  type AutomationLog,
} from '@/api/automation';

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
  const { t, i18n } = useTranslation('automation');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(getEmptyForm());
  const [logsRuleId, setLogsRuleId] = useState<string | null>(null);

  const TRIGGER_TYPES = [
    { value: 'cardMoved', label: t('triggerTypes.cardMoved') },
    { value: 'cardCreated', label: t('triggerTypes.cardCreated') },
    { value: 'labelAdded', label: t('triggerTypes.labelAdded') },
  ];

  const CONDITION_FIELDS = [
    { value: 'priority', label: t('conditionFields.priority') },
    { value: 'column', label: t('conditionFields.column') },
    { value: 'label', label: t('conditionFields.label') },
  ];

  const CONDITION_OPERATORS = [
    { value: 'equals', label: t('conditionOperators.equals') },
    { value: 'notEquals', label: t('conditionOperators.notEquals') },
  ];

  const ACTION_TYPES = [
    { value: 'moveCard', label: t('actionTypes.moveCard') },
    { value: 'setLabel', label: t('actionTypes.setLabel') },
    { value: 'setAssignee', label: t('actionTypes.setAssignee') },
    { value: 'setPriority', label: t('actionTypes.setPriority') },
    { value: 'addComment', label: t('actionTypes.addComment') },
    { value: 'setDueDate', label: t('actionTypes.setDueDate') },
    { value: 'archive', label: t('actionTypes.archive') },
  ];

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
          className="text-sm text-[var(--accent)] hover:underline"
        >
          &larr; {t('backToBoard')}
        </Link>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-2">{t('automationRules')}</h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t('description')}
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 text-sm font-medium"
        >
          {t('createRule')}
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6 mb-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            {editingRule ? t('editRule') : t('newRule')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{t('ruleName')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('ruleNamePlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                required
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{t('trigger')}</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                {TRIGGER_TYPES.map((triggerType) => (
                  <option key={triggerType.value} value={triggerType.value}>
                    {triggerType.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--text-primary)]">{t('conditions')}</label>
                <button
                  type="button"
                  onClick={addCondition}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)] hover:border-[var(--accent)]"
                >
                  {t('addCondition')}
                </button>
              </div>
              {form.conditions.length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)] italic">{t('noConditions')}</p>
              )}
              <div className="space-y-2">
                {form.conditions.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-secondary)]">
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(i, 'field', e.target.value)}
                      className="px-2 py-1.5 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
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
                      className="px-2 py-1.5 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
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
                      placeholder={t('valuePlaceholder')}
                      className="flex-1 px-2 py-1.5 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
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
                <label className="block text-sm font-medium text-[var(--text-primary)]">{t('actions')}</label>
                <button
                  type="button"
                  onClick={addAction}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent)] px-2 py-1 rounded border border-[var(--accent)] hover:border-[var(--accent)]"
                >
                  {t('addAction')}
                </button>
              </div>
              {form.actions.length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)] italic">{t('noActions')}</p>
              )}
              <div className="space-y-2">
                {form.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-md border border-[var(--border-secondary)]">
                    <select
                      value={action.type}
                      onChange={(e) => updateActionType(i, e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-[var(--border-secondary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
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
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 text-sm font-medium"
              >
                {isPending ? t('saving') : editingRule ? t('saveChanges') : t('create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRule(null);
                  setForm(getEmptyForm());
                }}
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-[var(--text-tertiary)] text-sm">{t('loading')}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="text-base">{t('emptyTitle')}</p>
          <p className="text-sm mt-1">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id}>
              <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-[var(--text-primary)] truncate">{rule.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rule.isEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {rule.isEnabled ? t('enabled') : t('disabled')}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {t('trigger')}: {TRIGGER_TYPES.find((triggerType) => triggerType.value === rule.trigger.type)?.label ?? rule.trigger.type}
                    {rule.conditions.length > 0 && ` | ${t('conditionCount', { count: rule.conditions.length })}`}
                    {rule.actions.length > 0 && ` | ${t('actionCount', { count: rule.actions.length })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setLogsRuleId(logsRuleId === rule.id ? null : rule.id)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      logsRuleId === rule.id
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-secondary)]'
                        : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {t('logs')}
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(rule.id)}
                    disabled={toggleMutation.isPending}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
                      rule.isEnabled
                        ? 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {rule.isEnabled ? t('disable') : t('enable')}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="text-xs px-3 py-1.5 rounded border border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('confirmDelete', { name: rule.name }))) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>

              {/* Logs panel */}
              {logsRuleId === rule.id && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] border-t-0 rounded-b-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                      {t('executionLogs')}
                      <span className="ml-1 font-normal text-[var(--text-tertiary)]">{t('logsLast50')}</span>
                    </h5>
                    <button
                      onClick={() => setLogsRuleId(null)}
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      {t('close')}
                    </button>
                  </div>
                  {logsLoading ? (
                    <p className="text-xs text-[var(--text-tertiary)]">{t('loadingLogs')}</p>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-[var(--text-tertiary)] italic">{t('noLogs')}</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {logs.map((log: AutomationLog) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 py-1.5 px-2 bg-[var(--bg-primary)] rounded border border-[var(--border-secondary)] text-xs"
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
                          <span className="text-[var(--text-tertiary)] flex-shrink-0">
                            {new Date(log.createdAt).toLocaleString(i18n.language === 'ko' ? 'ko-KR' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          {log.cardId && (
                            <span className="text-[var(--text-tertiary)] flex-shrink-0">
                              Card: {log.cardId.slice(0, 8)}...
                            </span>
                          )}
                          {log.details != null && typeof log.details === 'object' ? (
                            <span className="text-[var(--text-tertiary)] truncate">
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
