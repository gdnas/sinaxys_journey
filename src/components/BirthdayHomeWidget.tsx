import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, MessageCircle, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getTodayBirthdays, enrichBirthdayEventsWithEmployees } from "@/lib/internalCommunicationDb";
import { useState } from "react";
import { BirthdayCommentsPanel } from "@/components/BirthdayCommentsPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function BirthdayHomeWidget() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const queryClient = useQueryClient();

  // Process birthdays when widget loads
  const processBirthdaysMutation = useMutation({
    mutationFn: async () => {
      return await supabase.functions.invoke("process-birthdays", {
        body: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthdays-today", companyId] });
    },
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["birthdays-today", companyId],
    queryFn: async () => {
      // Trigger birthday processing
      if (companyId) {
        processBirthdaysMutation.mutate();
      }
      const raw = await getTodayBirthdays(String(companyId));
      return enrichBirthdayEventsWithEmployees(raw);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="animate-pulse">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="mt-4 h-20 rounded-xl bg-gray-100" />
        </div>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white">
            <Cake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Aniversários</h3>
            <p className="text-sm text-muted-foreground">Nenhum aniversário hoje</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white">
            <Cake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Aniversários de Hoje 🎉</h3>
            <p className="text-sm text-muted-foreground">
              {events.length} aniversariante{events.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-xl border border-white bg-white/80 p-4 backdrop-blur-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                {event.employee_avatar ? (
                  <Avatar className="h-12 w-12 border-2 border-pink-200">
                    <AvatarImage src={event.employee_avatar} alt={event.employee_name} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                      {getInitials(event.employee_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-12 w-12 border-2 border-pink-200 bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                    <AvatarFallback>{getInitials(event.employee_name)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{event.employee_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {event.employee_job_title && <span>{event.employee_job_title}</span>}
                    {event.employee_job_title && event.employee_department_name && <span>•</span>}
                    {event.employee_department_name && <span>{event.employee_department_name}</span>}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                onClick={() => setSelectedEvent(event)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Deixar mensagem
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Gift className="h-4 w-4" />
          <span>Celebre com seu time! Deixe uma mensagem de parabéns 🎊</span>
        </div>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <BirthdayCommentsPanel
              birthdayEvent={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}