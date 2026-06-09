import { notFound } from "next/navigation";
import { getTeamById } from "@/lib/repo";
import TeamPhoto from "@/components/TeamPhoto";
import Contacts from "@/components/Contacts";

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  const team = Number.isInteger(teamId) ? getTeamById(teamId) : undefined;
  if (!team) notFound();

  const shared = team.contacts_consent === 1;

  return (
    <div className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <TeamPhoto number={team.number} className="w-full object-cover" />
        <div className="p-5">
          <div className="text-xs font-medium text-stone-400">Команда №{team.number}</div>
          <h1 className="mt-0.5 text-xl font-bold text-stone-900">{team.name}</h1>

          <h2 className="mt-5 mb-1 text-sm font-semibold text-stone-700">Контакты</h2>
          {shared ? (
            <Contacts
              email={team.email}
              phone={team.phone}
              telegram={team.telegram}
              maxLink={team.max_link}
              className="block text-sm text-stone-600"
            />
          ) : (
            <p className="text-sm text-stone-400">
              Команда скрыла контакты. Свяжитесь через сервис.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
