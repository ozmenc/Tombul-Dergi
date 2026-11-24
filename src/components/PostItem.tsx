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

/** Kapak yoksa yazarın renginde tombul bir yer tutucu. */
function Cover({ post, big }: { post: Post; big?: boolean }) {
  if (post.cover) return <img className={big ? "cover cover-big" : "cover"} src={post.cover} alt="" loading="lazy" />;
  return <div className={big ? "cover cover-big cover-empty" : "cover cover-empty"} style={{ background: colorFor(post.author_id) }} aria-hidden="true"><span className="cover-face" /></div>;
}

export function FeaturedPost({ post }: { post: Post }) {
  return (
    <article className="featured">
      <Link to={`/yazi/${post.slug}`} className="featured-cover" tabIndex={-1} aria-hidden="true"><Cover post={post} big /></Link>
      <div>
        <h2 className="featured-title"><Link to={`/yazi/${post.slug}`}>{post.title}</Link></h2>
        <p className="featured-excerpt">{excerpt(post.content, 240)}</p>
        <PostMeta post={post} />
      </div>
    </article>
  );
}

export function PostRow({ post, showAuthor = true }: { post: Post; showAuthor?: boolean }) {
  return (
    <article className="row-post">
      <div className="row-text">
        <h3><Link to={`/yazi/${post.slug}`}>{post.title}</Link></h3>
        <p className="row-excerpt">{excerpt(post.content)}</p>
        <PostMeta post={showAuthor ? post : { ...post, author: null }} />
      </div>
      <Link to={`/yazi/${post.slug}`} tabIndex={-1} aria-hidden="true"><Cover post={post} /></Link>
    </article>
  );
}
