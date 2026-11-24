import { Link } from "react-router";
import { useAsync } from "../lib/useAsync";
import { listPublished } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { useAuth } from "../lib/auth";
import { Mascot } from "../components/Mascot";
import { Sunburst } from "../components/Sunburst";
import { FeaturedPost, PostRow } from "../components/PostItem";
import { EmptyState, ErrorState, PostListSkeleton } from "../components/States";

export default function Home() {
  useTitle();
  const auth = useAuth();
  const [state, retry] = useAsync(listPublished, []);
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="kicker">Kampüsten, kafadan, her yerden</p>
          <h1 className="title-plate">Tombul Dergi</h1>
          <p className="hero-lede">Üniversitelilerin her şey hakkında yazdığı dergi. Ders notundan yurt hikâyesine, bilimden şehrin en iyi çay ocağına.</p>
          <div className="row-actions">
            <a className="btn btn-primary" href="#yazilar">Yazıları oku</a>
            {auth.status !== "signed-in" && <Link className="btn" to="/giris">Yazar girişi</Link>}
          </div>
        </div>
        <div className="stage">
          <Sunburst className="stage-rays" />
          <div className="stage-cast">
            <Mascot kind="flask" size={108} delay={0.5} talk className="cast-flask" />
            <Mascot kind="atom" size={118} delay={0.35} talk className="cast-atom" />
            <Mascot kind="tombul" size={220} delay={0.1} talk className="cast-tombul" />
            <Mascot kind="planet" size={122} delay={0.65} talk className="cast-planet" />
            <Mascot kind="scope" size={112} delay={0.8} talk className="cast-scope" />
            <Mascot kind="rocket" size={108} delay={0.95} talk className="cast-rocket" />
          </div>
          <p className="stage-hint">Bir karaktere dokun, bir şey söylesin.</p>
        </div>
      </section>

      <section id="yazilar" className="section" aria-labelledby="h-latest">
        <h2 id="h-latest" className="section-title">Son yazılar</h2>
        {state.status === "loading" && <PostListSkeleton />}
        {state.status === "error" && <ErrorState title="Yazılar yüklenemedi" error={state.error} onRetry={retry} />}
        {state.status === "success" && (state.data.length === 0
          ? <EmptyState title="Henüz yayında yazı yok">İlk yazıyı yazacak kişi sen olabilirsin. Bir yazar hesabın varsa panelden başla.</EmptyState>
          : <>
              <FeaturedPost post={state.data[0]} />
              <div className="rows">{state.data.slice(1).map((p, i) => <PostRow key={p.id} post={p} index={i} />)}</div>
            </>)}
      </section>
    </>
  );
}
