import { colorFor, initials } from "../lib/format";

type Person = { id: string; name: string; avatar_url?: string };

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const face = (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: colorFor(person.id) }} aria-hidden="true">
      {person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" /> : initials(person.name)}
    </span>
  );
  return face;
}
