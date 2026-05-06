import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | Hello world" },
      { name: "description", content: "Hello world는 공부한 내용을 카테고리별로 정리하고 기록하는 개인 학습 아카이브입니다." },
      { property: "og:title", content: "About — Hello world" },
      { property: "og:description", content: "Hello world 운영자 소개와 연락 방법" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Layout>
      <article className="rounded-lg border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="mt-4 leading-relaxed text-foreground">
          <strong>Hello world</strong>는 공부한 내용을 카테고리별로 정리하고 차곡차곡 쌓아가는 개인 학습 아카이브입니다.
          새로 배운 개념, 읽은 책, 정리한 메모를 한 곳에 모아 다시 꺼내볼 수 있도록 만들었습니다.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          따뜻한 베이지 톤의 차분한 디자인으로 오래 머물러도 편안하게 읽을 수 있도록 했습니다.
        </p>

        <h2 className="mt-8 text-lg font-semibold">운영자</h2>
        <p className="mt-2 text-muted-foreground">꾸준히 배우고 기록하는 사람</p>

        <h2 className="mt-6 text-lg font-semibold">연락</h2>
        <p className="mt-2 text-muted-foreground">
          이메일: <a className="text-primary underline" href="mailto:s2oni@naver.com">s2oni@naver.com</a>
        </p>

        <div className="mt-8">
          <Link to="/" className="text-primary hover:underline">← 홈으로</Link>
        </div>
      </article>
    </Layout>
  );
}
