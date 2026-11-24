import { Link } from "react-router";
import type { FeedPost } from "../lib/types";
import { excerpt, fmtRelative, readingMinutes } from "../lib/format";
import { Avatar } from "./Avatar";
import { FollowButton, SaveButton, ShareButton, VoteButtons } from "./Actions";
import { Icon } from "./Icon";

/** Akıştaki gönderi kartı: yazar, başlık, özet, kapak ve tepkiler. */
export function PostCard({ post, showFollow = true }: { post: FeedPost; showFollow?: boolean }) {
  const url = `/yazi/${post.slug}`;
  return (
    <article className="post-card">
      <header className="post-head">
        {post.author && <Link to={`/yazar/${post.author.id}`} tabIndex={-1} aria-hidden="true"><Avatar person={post.author} size={44} /></Link>}
        <div className="who">
          {post.author && <Link to={`/yazar/${post.author.id}`}>{post.author.name || "İsimsiz yazar"}</Link>}
          <small>
            {fmtRelative(post.published_at)}
            {post.category && <> · <Link to={`/kesfet?kategori=${post.category.slug}`}>{post.category.name}</Link></>}
            {" · "}{readingMinutes(post.content)} dk
          </small>
        </div>
        {post.featured && <span className="badge badge-amber featured-flag"><Icon name="star" className="icon" filled /> Öne çıkan</span>}
        {showFollow && post.author && !post.featured && <FollowButton authorId={post.author.id} small />}
      </header>
      <h2 className="post-title"><Link to={url}>{post.title}</Link></h2>
      <p className="post-excerpt">{post.excerpt || excerpt(post.content, 220)}</p>
      {post.cover && <Link to={url} tabIndex={-1} aria-hidden="true"><img className="post-cover" src={post.cover} alt="" loading="lazy" /></Link>}
      <div className="post-actions">
        <VoteButtons kind="post" id={post.id} likes={post.stats.likes} dislikes={post.stats.dislikes} myVote={post.myVote} />
        <Link to={`${url}#yorumlar`} className="act" aria-label={`${post.stats.comments} yorum`}>
          <Icon name="comment" /><span aria-hidden="true">{post.stats.comments}</span>
        </Link>
        <span className="spacer" />
        <SaveButton postId={post.id} />
        <ShareButton slug={post.slug} title={post.title} />
      </div>
    </article>
  );
}
