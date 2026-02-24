import { useQuery } from '@tanstack/react-query';
import { activitiesApi, type Activity } from '@/api/activities';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'created',
  UPDATED: 'updated',
  MOVED: 'moved',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  COMMENTED: 'commented on',
  ASSIGNED: 'was assigned to',
  LABEL_ADDED: 'added label to',
  LABEL_REMOVED: 'removed label from',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({
  boardId,
  isOpen,
  onClose,
}: {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', boardId],
    queryFn: () => activitiesApi.list(boardId, 30),
    enabled: isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[3.5rem] bottom-0 w-80 bg-white border-l shadow-lg z-40 flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">Activity</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : !activities || activities.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">No activity yet.</div>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const actionLabel = ACTION_LABELS[activity.action] ?? activity.action.toLowerCase();

  return (
    <div className="px-4 py-3 hover:bg-gray-50">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
          {activity.user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{activity.user.name}</span>{' '}
            {actionLabel}{' '}
            {activity.card && (
              <span className="font-medium">
                KF-{String(activity.card.cardNumber).padStart(3, '0')} {activity.card.title}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
