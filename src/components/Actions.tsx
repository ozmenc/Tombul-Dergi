import { useEffect, useState } from "react";
import { votePost, voteComment } from "../lib/api/social";
import { useSocial } from "../lib/social";
import { useMe } from "../lib/auth";
import { useRequireMember } from "../lib/useRequireMember";
import type { Vote } from "../lib/types";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

const BURST = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { "--dx": `${Math.cos(a) * 26}px`, "--dy": `${Math.sin(a) * 26}px` } as React.CSSProperties;
});

type VoteProps = { kind: "post" | "comment"; id: string; likes: number; dislikes: number; myVote: Vote; large?: boolean };

/** Beğen / beğenme. Aynı düğmeye tekrar basmak oyu geri alır. */
export function VoteButtons({ kind, id, likes, dislikes, myVote, large = false }: VoteProps) {
  const requireLogin = useRequireMember();
  const toast = useToast();
  const [s, setS] = useState({ likes, dislikes, mine: myVote });
  const [burst, setBurst] = useState(0);
  useEffect(() => setS({ likes, dislikes, mine: myVote }), [likes, dislikes, myVote]);

  async function cast(value: 1 | -1) {
    const me = requireLogin(value === 1 ? "Beğenmek" : "Oy vermek");
    if (!me) return;
    const before = s;
    const next: Vote = s.mine === value ? 0 : value;
    setS({
      mine: next,
      likes: s.likes - (s.mine === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      dislikes: s.dislikes - (s.mine === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
    });
    if (next === 1) setBurst((n) => n + 1);
    try {
      await (kind === "post" ? votePost(id, me.id, next) : voteComment(id, me.id, next));
    } catch {
      setS(before);
      toast("error", "Oyun kaydedilemedi. Tekrar dene.");
    }
  }

  const cls = large ? "act act-lg" : "act";
  return (
    <>
      <button type="button" className={`${cls} like ${s.mine === 1 ? "on" : ""}`} aria-pressed={s.mine === 1} onClick={() => cast(1)}
        aria-label={`Beğen, ${s.likes} beğeni`}>
        {burst > 0 && <span className="burst" key={burst} aria-hidden="true">{BURST.map((st, i) => <i key={i} style={st} />)}</span>}
        <Icon name="like" filled={s.mine === 1} />
        <span aria-hidden="true">{s.likes}</span>
      </button>
      <button type="button" className={`${cls} dislike ${s.mine === -1 ? "on" : ""}`} aria-pressed={s.mine === -1} onClick={() => cast(-1)}
        aria-label={`Beğenme, ${s.dislikes} beğenmeme`}>
        <Icon name="dislike" filled={s.mine === -1} />
        <span aria-hidden="true">{s.dislikes}</span>
      </button>
    </>
  );
}

export function SaveButton({ postId, large = false }: { postId: string; large?: boolean }) {
  const { saved, toggleSave } = useSocial();
  const requireLogin = useRequireMember();
  const toast = useToast();
  const on = saved.has(postId);
  async function click() {
    if (!requireLogin("Kaydetmek")) return;
    try {
      toast("success", (await toggleSave(postId)) ? "Kaydedildi. Kaydettiklerim'de bulabilirsin." : "Kaydedilenlerden çıkarıldı.");
    } catch {
      toast("error", "Kaydedilemedi. Tekrar dene.");
    }
  }
  return (
    <button type="button" className={`act ${large ? "act-lg" : ""} ${on ? "saved" : ""}`} aria-pressed={on} onClick={click} aria-label={on ? "Kaydedildi" : "Kaydet"}>
      <Icon name="bookmark" filled={on} />
      {large && <span>{on ? "Kaydedildi" : "Kaydet"}</span>}
    </button>
  );
}

export function ShareButton({ slug, title, large = false }: { slug: string; title: string; large?: boolean }) {
  const toast = useToast();
  async function click() {
    const url = `${location.origin}/yazi/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast("success", "Bağlantı kopyalandı."); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("error", "Paylaşılamadı. Bağlantıyı adres çubuğundan kopyalayabilirsin.");
    }
  }
  return (
    <button type="button" className={`act ${large ? "act-lg" : ""}`} onClick={click} aria-label="Paylaş">
      <Icon name="share" />
      {large && <span>Paylaş</span>}
    </button>
  );
}

export function FollowButton({ authorId, small = false }: { authorId: string; small?: boolean }) {
  const me = useMe();
  const { following, toggleFollow } = useSocial();
  const requireLogin = useRequireMember();
  const toast = useToast();
  if (me?.id === authorId) return null;
  const on = following.has(authorId);
  async function click() {
    if (!requireLogin("Takip etmek")) return;
    try { await toggleFollow(authorId); } catch { toast("error", "Takip güncellenemedi. Tekrar dene."); }
  }
  return (
    <button type="button" className={`btn ${small ? "btn-sm" : ""} ${on ? "" : "btn-ink"}`} aria-pressed={on} onClick={click}>
      {on ? <><Icon name="check" /> Takiptesin</> : "Takip et"}
    </button>
  );
}
