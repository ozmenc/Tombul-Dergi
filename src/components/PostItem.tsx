import { Link } from "react-router";
import type { Post } from "../lib/types";
import { colorFor, excerpt, fmtDate, readingMinutes } from "../lib/format";

export function PostMeta({ post, linkAuthor = true }: { post: Post; linkAuthor?: boolean }) {
  return (
    <p className="meta">
      {post.author && (linkAuthor ? <Link to={`/yazar/${post.author.id}`} className="meta-author">{post.author.name}</Link> : <span className="meta-author">{post.author.name}</span>)}
      <time dateTime={post.published_at ?? undefined}>{fmtDate(post.published_at)}</time>
      <span>{readingMinutes(post.content)} dk okuma</span>
    </p>
  );
}

/** Kapak yoksa yazarın renginde bir atom çağı baskısı: yıldız patlaması ve pırıltılar. */
function Cover({ post, big }: { post: Post; big?: boolean }) {
  const cls = big ? "cover cover-big" : "cover";
  if (post.cover) return <img className={cls} src={post.cover} alt="" loading="lazy" />;
  return (
    <div className={`${cls} cover-empty`} style={{ background: colorFor(post.author_id) }} aria-hidden="true">
      <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice">
        <polygon className="cv-burst" points="78,12 84,32 104,26 92,42 110,54 88,56 92,78 76,64 62,80 60,58 40,62 52,46 38,32 58,32 60,12 70,28" />
        <path className="cv-spark" d="M24 14 l2 8 8 2 -8 2 -2 8 -2 -8 -8 -2 8 -2z" />
        <path className="cv-spark" d="M30 62 l1.4 5 5 1.4 -5 1.4 -1.4 5 -1.4 -5 -5 -1.4 5 -1.4z" />
        <circle className="cv-dot" cx="100" cy="76" r="3" /><circle className="cv-dot" cx="108" cy="70" r="2" />
      </svg>
    </div>
  );
}

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="card featured">
      <Link to={`/yazi/${post.slug}`} className="featured-cover" tabIndex={-1} aria-hidden="true"><Cover post={post} big /></Link>
      <div>
        <h3 className="featured-title"><Link to={`/yazi/${post.slug}`}>{post.title}</Link></h3>
        <p className="featured-excerpt">{excerpt(post.content, 240)}</p>
        <PostMeta post={post} />
      </div>
    </article>
  );
}

const PLATES = ["var(--mustard)", "var(--teal)", "var(--coral)", "var(--blue)"];

export function PostRow({ post, showAuthor = true, index = 0 }: { post: Post; showAuthor?: boolean; index?: number }) {
  return (
    <article className="card row-post" style={{ ["--plate" as string]: PLATES[index % PLATES.length] }}>
      <div className="row-text">
        <h3><Link to={`/yazi/${post.slug}`}>{post.title}</Link></h3>
        <p className="row-excerpt">{excerpt(post.content)}</p>
        <PostMeta post={showAuthor ? post : { ...post, author: null }} />
      </div>
      <Link to={`/yazi/${post.slug}`} tabIndex={-1} aria-hidden="true"><Cover post={post} /></Link>
    </article>
  );
}
