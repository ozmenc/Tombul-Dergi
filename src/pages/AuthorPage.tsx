import { useParams } from "react-router";
import { getAuthor } from "../lib/api/people";
import { followerCount } from "../lib/api/social";
import { listPublished } from "../lib/api/posts";
import { useAsync } from "../lib/useAsync";
import { useTitle } from "../lib/useTitle";
import { useSocial } from "../lib/social";
import { useMe } from "../lib/auth";
import { ROLE_LABEL } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/Actions";
import { PostCard } from "../components/PostCard";
import { EmptyState, ErrorState, FeedSkeleton, NotFound } from "../components/States";

export default function AuthorPage() {
  const { id = "" } = useParams();
  const me = useMe();
  const { following } = useSocial();
  const [author, retry] = useAsync(() => getAuthor(id), [id]);
  const [posts, retryPosts] = useAsync(() => listPublished({ authorId: id }), [id, me?.id]);
  // Takip edince/bırakınca sayaç sunucudan tazelenir.
  const [followers] = useAsync(() => followerCount(id), [id, following.has(id)]);
  useTitle(author.status === "success" ? author.data?.name ?? "Yazar bulunamadı" : undefined);

  if (author.status === "loading") return <FeedSkeleton rows={1} />;
  if (author.status === "error") return <ErrorState title="Yazar yüklenemedi" error={author.error} onRetry={retry} />;
  if (!author.data) return <NotFound title="Bu yazar bulunamadı">Adres yanlış olabilir ya da bu kişi artık yazmıyor.</NotFound>;

  const a = author.data;

  return (
    <>
      <header className="profile-head card">
        <Avatar person={a} size={104} ring />
        <div className="profile-text">
          <span className="badge badge-blue">{ROLE_LABEL[a.role]}</span>
          <h1>{a.name || "İsimsiz yazar"}</h1>
          {a.bio && <p>{a.bio}</p>}
          <div className="profile-stats">
            <span><strong>{a.posts}</strong> yazı</span>
            <span><strong>{followers.status === "success" ? followers.data : a.followers}</strong> takipçi</span>
          </div>
        </div>
        <FollowButton authorId={a.id} />
      </header>
      {posts.status === "loading" && <FeedSkeleton rows={2} />}
      {posts.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={posts.error} onRetry={retryPosts} />}
      {posts.status === "success" && (posts.data.length === 0
        ? <EmptyState title="Henüz yayında yazısı yok">{a.name} ilk yazısını hazırlıyor.</EmptyState>
        : posts.data.map((p) => <PostCard key={p.id} post={p} showFollow={false} />))}
    </>
  );
}
