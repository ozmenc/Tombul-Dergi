import { Link } from "react-router";
import type { ListedPost } from "../lib/types";
import { excerpt, fmtDate, readingMinutes } from "../lib/format";
import { Avatar } from "./Avatar";
import { CheersButton } from "./Cheers";

/** Dergi listesindeki yazı: kategori, başlık, özet, yazar, tokuşturma ve kapak. `lead`: sayfanın manşeti. */
export function PostCard({ post, lead = false }: { post: ListedPost; lead?: boolean }) {
  const url = `/yazi/${post.slug}`;
  return (
    <article className={`post-card ${lead ? "post-lead" : ""} ${post.cover ? "has-cover" : ""}`}>
      <div className="post-text">
        <p className="kicker">
          {post.featured && <span className="kicker-featured">Öne çıkan</span>}
          {post.category && <Link to={`/kesfet?kategori=${post.category.slug}`}>{post.category.name}</Link>}
        </p>
        <h2 className="post-title"><Link to={url}>{post.title}</Link></h2>
        <p className="post-excerpt">{post.excerpt || excerpt(post.content, lead ? 280 : 200)}</p>
        <p className="byline">
          {post.author && (
            <Link to={`/yazar/${post.author.id}`} className="byline-author"><Avatar person={post.author} size={28} />{post.author.name || "İsimsiz yazar"}</Link>
          )}
          <span>{fmtDate(post.published_at)} · {readingMinutes(post.content)} dk okuma</span>
          <span className="byline-cheers"><CheersButton postId={post.id} count={post.cheers} /></span>
        </p>
      </div>
      {post.cover && <Link to={url} tabIndex={-1} aria-hidden="true" className="post-cover-link"><img className="post-cover" src={post.cover} alt="" loading="lazy" /></Link>}
    </article>
  );
}
