import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

const NOTIFICATION_TYPES = [
  { type: 'ASSIGNED', label: 'Assigned to card', description: 'When someone assigns you to a card' },
  { type: 'COMMENTED', label: 'New comment', description: 'When someone comments on a card you are watching' },
  { type: 'DUE_DATE_REMINDER', label: 'Due date reminder', description: 'When a card due date is approaching' },
  { type: 'CARD_MOVED', label: 'Card moved', description: 'When a card you are watching is moved' },
  { type: 'MENTIONED', label: 'Mentioned', description: 'When someone mentions you in a comment' },
  { type: 'BOARD_INVITATION', label: 'Board invitation', description: 'When you are invited to a board' },
];

export default function NotificationSettings({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => notificationsApi.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      notificationsApi.updateSetting(type, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const getEnabled = (type: string): boolean => {
    const setting = settings.find((s) => s.type === type);
    // Default to enabled if not set
    return setting ? setting.enabled : true;
  };

  const handleToggle = (type: string) => {
    const current = getEnabled(type);
    updateMutation.mutate({ type, enabled: !current });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Notification Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading settings...</div>
          ) : (
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map(({ type, label, description }) => {
                const enabled = getEnabled(type);
                const isPending = updateMutation.isPending && updateMutation.variables?.type === type;

                return (
                  <div key={type} className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(type)}
                      disabled={isPending}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                        enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={enabled}
                      title={enabled ? 'Disable' : 'Enable'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
