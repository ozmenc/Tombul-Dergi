import { useParams } from "react-router";
import { getAuthor } from "../lib/api/people";
import { listPublished } from "../lib/api/posts";
import { useAsync } from "../lib/useAsync";
import { usePaged } from "../lib/usePaged";
import { useTitle } from "../lib/useTitle";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../components/PostCard";
import { EmptyState, ErrorState, FeedSkeleton, LoadMore, NotFound } from "../components/States";

export default function AuthorPage() {
  const { id = "" } = useParams();
  const [author, retry] = useAsync(() => getAuthor(id), [id]);
  const { state: posts, retry: retryPosts, more, hasMore, moreBusy } = usePaged((limit) => listPublished({ authorId: id, limit }), [id]);
  useTitle(author.status === "success" ? author.data?.name ?? "Yazar bulunamadı" : undefined);

  if (author.status === "loading") return <FeedSkeleton rows={1} />;
  if (author.status === "error") return <ErrorState title="Yazar yüklenemedi" error={author.error} onRetry={retry} />;
  if (!author.data) return <NotFound title="Bu yazar bulunamadı">Adres yanlış olabilir ya da bu kişi artık yazmıyor.</NotFound>;

  const a = author.data;

  return (
    <>
      <header className="profile-head card">
        <Avatar person={a} size={104} />
        <div className="profile-text">
          <h1>{a.name || "İsimsiz yazar"}</h1>
          {a.bio && <p>{a.bio}</p>}
          <div className="profile-stats">
            <span><strong>{a.posts}</strong> yazı</span>
          </div>
        </div>
      </header>
      {posts.status === "loading" && <FeedSkeleton rows={2} />}
      {posts.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={posts.error} onRetry={retryPosts} />}
      {posts.status === "success" && (posts.data.length === 0
        ? <EmptyState title="Henüz yayında yazısı yok">{a.name} ilk yazısını hazırlıyor.</EmptyState>
        : <>
            {posts.data.map((p) => <PostCard key={p.id} post={p} />)}
            <LoadMore hasMore={hasMore} busy={moreBusy} onMore={more} />
          </>)}
    </>
  );
}
