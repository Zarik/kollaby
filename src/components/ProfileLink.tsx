/** Иконка-ссылка на профиль команды — открывает страницу профиля и контактов в новом окне. */
export default function ProfileLink({
  teamId,
  className,
}: {
  teamId: number;
  className?: string;
}) {
  return (
    <a
      href={`/team/${teamId}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Профиль и контакты команды (в новом окне)"
      aria-label="Профиль и контакты команды"
      className={`inline-flex items-center align-middle text-stone-400 hover:text-indigo-600 ${className ?? ""}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </a>
  );
}
