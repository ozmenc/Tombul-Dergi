import { Link, useParams } from "react-router";
import { useAsync } from "../lib/useAsync";
import { getPublished } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { renderMarkdown } from "../lib/markdown";
import { PostMeta } from "../components/PostItem";
import { Avatar } from "../components/Avatar";
import { ArticleSkeleton, ErrorState, NotFound } from "../components/States";

export default function PostPage() {
  const { slug = "" } = useParams();
  const [state, retry] = useAsync(() => getPublished(slug), [slug]);
  useTitle(state.status === "success" ? state.data?.title ?? "Yazı bulunamadı" : undefined);

  if (state.status === "loading") return <ArticleSkeleton />;
  if (state.status === "error") return <div className="page"><ErrorState title="Yazı yüklenemedi" error={state.error} onRetry={retry} /></div>;
  const post = state.data;
  if (!post) return <NotFound title="Bu yazı bulunamadı">Yazı kaldırılmış ya da henüz yayımlanmamış olabilir.</NotFound>;

  return (
    <article className="article-wrap">
      <Link to="/" className="back">← Tüm yazılar</Link>
      <div className="card article-card">
      <h1 className="article-title">{post.title}</h1>
      <PostMeta post={post} />
      {post.cover && <img className="article-cover" src={post.cover} alt="" />}
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      {post.author && (
        <Link to={`/yazar/${post.author.id}`} className="byline">
          <Avatar id={post.author.id} name={post.author.name} size={48} />
          <span><small>Yazan</small><strong>{post.author.name}</strong></span>
        </Link>
      )}
      </div>
    </article>
  );
}
