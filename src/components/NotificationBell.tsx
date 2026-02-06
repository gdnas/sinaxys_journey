import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockDb } from "@/lib/mockDb";
import { useAuth } from "@/lib/auth";

const DB_CHANGED_EVENT = "sinaxys-db-changed";

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = user?.id ?? null;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onDbChanged = () => setTick((t) => t + 1);
    window.addEventListener(DB_CHANGED_EVENT, onDbChanged);
    return () => window.removeEventListener(DB_CHANGED_EVENT, onDbChanged);
  }, []);

  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    // tick is only used to recompute
    void tick;
    return mockDb.getUnreadNotificationsCount(userId);
  }, [userId, tick]);

  if (!user) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative rounded-full border-[color:var(--sinaxys-border)] bg-white"
      aria-label={unreadCount ? `Notificações (${unreadCount} não lidas)` : "Notificações"}
      onClick={() => navigate("/profile?tab=notificacoes")}
    >
      <Bell className="h-4 w-4" />
      {unreadCount ? (
        <span
          className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white"
          aria-hidden
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
