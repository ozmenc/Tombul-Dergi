import { Link, useNavigate, useParams } from "react-router";
import { getPublished, listRelated } from "../lib/api/posts";
import { useAsync } from "../lib/useAsync";
import { useTitle } from "../lib/useTitle";
import { renderMarkdown } from "../lib/markdown";
import { fmtDate, readingMinutes } from "../lib/format";
import type { ListedPost } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { ShareButton } from "../components/Actions";
import { CheersButton } from "../components/Cheers";
import { ContentNotice, ReportButton } from "../components/Report";
import { Icon } from "../components/Icon";
import { PostCard } from "../components/PostCard";
import { ErrorState, FeedSkeleton, NotFound } from "../components/States";

export default function PostPage() {
  const { slug = "" } = useParams();
  const [state, retry] = useAsync(() => getPublished(slug), [slug]);
  useTitle(state.status === "success" ? state.data?.title ?? "Yazı bulunamadı" : undefined);

  if (state.status === "loading") return <FeedSkeleton rows={1} />;
  if (state.status === "error") return <ErrorState title="Yazı yüklenemedi" error={state.error} onRetry={retry} />;
  if (!state.data) return <NotFound title="Bu yazı bulunamadı">Kaldırılmış ya da henüz yayımlanmamış olabilir.</NotFound>;
  return <Article post={state.data} />;
}

function Article({ post }: { post: ListedPost }) {
  const navigate = useNavigate();
  const [related] = useAsync(() => listRelated(post), [post.id]);
  const back = () => (history.length > 1 ? navigate(-1) : navigate("/"));

  return (
    <>
      <article className="article card">
        <div className="article-top">
          <button type="button" className="btn icon-btn" onClick={back} aria-label="Geri"><Icon name="back" /></button>
          {post.category && <Link className="badge badge-blue" to={`/kesfet?kategori=${post.category.slug}`}>{post.category.name}</Link>}
          {post.featured && <span className="badge badge-amber"><Icon name="star" className="icon" filled /> Öne çıkan</span>}
        </div>
        <h1 className="article-title">{post.title}</h1>
        {post.excerpt && <p className="article-lede">{post.excerpt}</p>}
        {post.author && (
          <div className="post-head">
            <Link to={`/yazar/${post.author.id}`} tabIndex={-1} aria-hidden="true"><Avatar person={post.author} size={48} /></Link>
            <div className="who">
              <Link to={`/yazar/${post.author.id}`}>{post.author.name || "İsimsiz yazar"}</Link>
              <small>{fmtDate(post.published_at)} · {readingMinutes(post.content)} dk okuma</small>
            </div>
          </div>
        )}
        {post.cover && <img className="article-cover" src={post.cover} alt="" />}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        {post.tags.length > 0 && (
          <div className="tag-list" aria-label="Etiketler">
            {post.tags.map((t) => <Link key={t} className="chip" to={`/kesfet?etiket=${encodeURIComponent(t)}`}>#{t}</Link>)}
          </div>
        )}
        <div className="post-actions article-actions">
          <CheersButton postId={post.id} count={post.cheers} large />
          <span style={{ flex: 1 }} />
          <ShareButton slug={post.slug} title={post.title} />
          <ReportButton postId={post.id} />
        </div>
        <ContentNotice />
      </article>

      {related.status === "success" && related.data.length > 0 && (
        <section aria-labelledby="siradaki" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 id="siradaki" style={{ fontSize: 24 }}>Sıradaki yazılar</h2>
          {related.data.map((p) => <PostCard key={p.id} post={p} />)}
        </section>
      )}
    </>
  );
}
