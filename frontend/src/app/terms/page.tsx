import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 | DatePlanner',
  description: 'DatePlanner 서비스 이용약관',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: '이용약관 | DatePlanner',
    description: 'DatePlanner 서비스 이용약관',
    url: '/terms',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: '이용약관 | DatePlanner',
    description: 'DatePlanner 서비스 이용약관',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-10 shadow-xl shadow-stone-200/60">
          <header className="mb-10 border-b border-stone-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">DatePlanner Terms</p>
            <h1 className="mt-3 text-3xl font-extrabold text-stone-900">DatePlanner 이용약관</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              본 약관은 DatePlanner(이하 &quot;회사&quot;)가 제공하는 일정 기획 및 장소 추천 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 사이의 권리와 의무,
              책임 사항, 서비스 이용 조건을 규정합니다.
              이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있으며,
              약관에 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.
            </p>
            <p className="mt-1 text-xs text-stone-400">시행일자: 2026년 4월 14일</p>
          </header>

          <section className="space-y-8 text-sm leading-relaxed text-stone-700">
            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제1조 (목적)</h2>
              <p>
                본 약관은 회사가 제공하는 DatePlanner 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임 사항,
                기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
              <p>
                회사는 여행 및 데이트 일정 기획 기능,
                지역별 장소 검색과 AI 기반 추천,
                일정 공유 및 관리와 같은 다양한 부가 기능을 제공합니다.
                이용자는 본 약관에 따라 서비스를 이용하며,
                회사는 안정적인 서비스 제공을 위해 최선을 다합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제2조 (정의)</h2>
              <p>
                &quot;회원&quot;이라 함은 본 약관에 동의하고 회사와 서비스 이용 계약을 체결하여 계정을 발급받은 자를 의미합니다.
              </p>
              <p>
                &quot;비회원&quot;이라 함은 회원에 가입하지 않고 회사가 제공하는 일부 서비스를 이용하는 자를 말합니다.
              </p>
              <p>
                &quot;콘텐츠&quot;란 회원이 서비스에서 생성하거나 업로드 또는 저장하는 일정,
                장소 목록,
                메모 등 모든 자료를 의미합니다.
              </p>
              <p>
                &quot;연계 서비스&quot;란 DatePlanner가 OAuth 또는 API를 통해 연동하는 Google,
                Kakao,
                Naver 등 외부 서비스를 의미합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제3조 (약관의 효력 및 변경)</h2>
              <p>
                본 약관은 회원이 서비스에 가입하거나,
                로그인 화면,
                또는 기타 회사가 정한 방식에 따라 동의 의사를 표시함으로써 효력이 발생합니다.
              </p>
              <p>
                회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며,
                약관을 개정할 경우 적용 일자 및 개정 사유를 명시하여 사전에 공지합니다.
              </p>
              <p>
                회원은 변경된 약관에 동의하지 않을 권리가 있으며,
                약관 효력 발생일 이전까지 서비스 이용 계약을 해지할 수 있습니다.
                별도의 의사 표시가 없을 경우 변경된 약관에 동의한 것으로 간주됩니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제4조 (회원가입 및 계정)</h2>
              <p>
                회원가입은 회사가 제공하는 가입 양식에 필수 정보를 기재하고,
                이메일 인증 및 약관 동의 절차를 완료함으로써 이루어집니다.
              </p>
              <p>
                회원은 자신의 계정 정보를 정확하고 최신 상태로 유지해야 하며,
                타인의 정보를 도용하거나 허위로 기재할 수 없습니다.
              </p>
              <p>
                OAuth 계정으로 가입하는 경우 해당 플랫폼의 인증 정책을 따르며,
                동일 이메일을 사용하는 기존 계정과 충돌이 발생할 경우 회사의 안내에 따라 계정 연동 절차를 진행해야 합니다.
              </p>
              <p>
                회사는 다음 각 호에 해당하는 경우 가입 신청을 제한하거나 승인을 유보할 수 있습니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>타인의 명의를 도용하거나 허위 정보를 기재한 경우</li>
                <li>서비스 운영을 현저히 저해할 우려가 있는 경우</li>
                <li>관련 법령 또는 약관을 위반하여 이용 자격이 상실된 적이 있는 경우</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제5조 (계정 및 비밀번호 관리)</h2>
              <p>
                회원은 계정의 아이디와 비밀번호 및 소셜 로그인 정보를 제3자에게 공유하거나 양도할 수 없으며,
                관리 소홀로 발생하는 모든 책임은 회원 본인에게 있습니다.
              </p>
              <p>
                회원은 비밀번호가 도용되거나 타인이 계정을 무단으로 사용한 사실을 인지한 경우 즉시 회사에 통지하고 안내를 따라야 합니다.
              </p>
              <p>
                회사는 회원이 통지하지 않아 발생한 손해에 대하여 책임을 지지 않습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제6조 (서비스의 제공 및 변경)</h2>
              <p>
                회사는 다음과 같은 서비스를 제공합니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>지역 기반 장소 검색 및 장소 정보 제공</li>
                <li>AI 추천 알고리즘을 활용한 일정 시나리오 생성</li>
                <li>일정 저장,
                  노트 작성,
                  공유 링크 생성 기능</li>
                <li>이외 회사가 추가 개발하거나 다른 업체와 제휴를 통해 제공하는 서비스</li>
              </ul>
              <p>
                회사는 서비스의 품질 향상과 기능 추가를 위해 정기적인 업데이트를 수행하며,
                필요한 경우 서비스의 전부 또는 일부를 변경할 수 있습니다.
              </p>
              <p>
                서비스 내용이 중대하게 변경되는 경우 회사는 사전에 회원에게 공지합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제7조 (서비스의 중단)</h2>
              <p>
                회사는 시스템 점검,
                설비 보수,
                전기 통신 설비의 고장,
                천재지변 등 불가항력 사유가 발생한 경우 서비스 제공을 일시 중단할 수 있습니다.
              </p>
              <p>
                회사는 계획된 작업으로 서비스가 중단될 경우 사전에 공지하며,
                긴급한 상황에서는 사후 공지를 통해 내용을 안내합니다.
              </p>
              <p>
                회사는 정기점검 기타 사유로 서비스 제공을 일시 중지한 경우 이용자에게 발생한 손해를 배상할 책임이 있습니다.
                단,
                회사의 고의 또는 중대한 과실이 아닌 경우에는 그러하지 않습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제8조 (이용자의 의무)</h2>
              <p>
                회원은 관련 법령,
                본 약관,
                서비스 이용 안내 및 주의 사항을 준수해야 하며,
                회사의 정상적인 업무를 방해하는 행위를 해서는 안 됩니다.
              </p>
              <p>회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>서비스 신청 또는 변경 시 허위 사실을 기재하거나 타인의 정보를 도용하는 행위</li>
                <li>회사 또는 제3자의 지식재산권 등 권리를 침해하는 행위</li>
                <li>서비스 운영을 방해하기 위한 자동화 스크립트,
                  크롤링,
                  비정상적 트래픽 유발 행위</li>
                <li>법령에 위반되거나 미풍양속에 반하는 콘텐츠를 등록하는 행위</li>
                <li>기타 회사가 서비스 운영상 부적절하다고 판단하는 행위</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제9조 (콘텐츠 및 지식재산권)</h2>
              <p>
                서비스와 관련된 모든 소프트웨어,
                디자인,
                로고,
                상표,
                데이터베이스 등 지식재산권은 회사 또는 회사에 라이선스를 제공한 자에게 귀속됩니다.
              </p>
              <p>
                회원이 서비스 내에 게시하거나 저장한 콘텐츠의 저작권은 해당 회원에게 있으며,
                회사는 서비스 운영을 위한 범위 내에서 콘텐츠를 사용할 수 있습니다.
              </p>
              <p>
                회원은 자신이 등록한 콘텐츠에 대하여 필요한 권리를 보유해야 하며,
                제3자의 권리를 침해하지 않도록 주의해야 합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제10조 (제3자 서비스 및 광고)</h2>
              <p>
                서비스에는 외부 지도 서비스,
                광고 네트워크,
                결제 대행사 등 제3자가 제공하는 기능이 포함될 수 있습니다.
              </p>
              <p>
                제3자가 제공하는 서비스의 경우 당해 사업자의 약관과 개인정보 처리방침이 적용되며,
                회사는 해당 서비스와 관련한 법적 책임을 부담하지 않습니다.
              </p>
              <p>
                회원이 콘텐츠에 포함된 광고를 이용하거나 광고주의 판촉 활동에 참여하는 것은 전적으로 회원과 광고주 간의 문제이며,
                회사는 그 과정에서 발생한 손해에 대해 책임을 지지 않습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제11조 (개인정보 보호)</h2>
              <p>
                회사는 개인정보 보호법 등 관련 법령을 준수하며,
                회원의 개인정보를 보호하기 위해 개인정보처리방침을 제정하고 공개합니다.
              </p>
              <p>
                회원의 개인정보는 서비스 제공 및 고객 지원,
                보안 강화를 위한 목적으로만 이용되며,
                법령에서 정한 경우를 제외하고 제3자에게 제공되지 않습니다.
              </p>
              <p>
                개인정보의 수집 항목,
                이용 목적,
                보관 기간 등 구체적인 사항은 개인정보처리방침을 통해 확인할 수 있습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제12조 (이용 제한)</h2>
              <p>
                회사는 회원이 약관을 위반하거나 다음 각 호에 해당하는 경우 사전 통지 없이 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>서비스의 안정적인 운영을 방해하는 경우</li>
                <li>타인의 권리를 침해하거나 위법 행위를 하는 경우</li>
                <li>사진,
                  위치 정보 등 개인정보를 무단으로 수집하는 경우</li>
                <li>불법 프로그램을 생성,
                  배포,
                  사용하는 경우</li>
              </ul>
              <p>
                회사는 이용 제한 조치를 하는 경우 사유와 기간을 회원에게 통지하며,
                회원은 이의신청을 통해 소명할 수 있습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제13조 (계약 해지)</h2>
              <p>
                회원은 언제든지 서비스 내 탈퇴 기능을 이용하여 이용 계약을 해지할 수 있습니다.
              </p>
              <p>
                회원이 계약을 해지할 경우 회사는 관련 법령과 개인정보 처리방침이 정한 범위 내에서 회원 정보를 보유하거나 파기합니다.
              </p>
              <p>
                회원 탈퇴 이후에도 회원이 작성한 후기,
                댓글,
                공유 링크 등 일부 콘텐츠는 다른 이용자의 서비스 이용을 위해 삭제되지 않을 수 있습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제14조 (면책)</h2>
              <p>
                회사는 천재지변,
                전쟁,
                테러,
                정전,
                통신 장애,
                법령 또는 정부의 사실상 또는 법적 조치 등 회사의 합리적인 통제를 벗어난 사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
              </p>
              <p>
                회사는 회원의 귀책 사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
              </p>
              <p>
                회사는 회원이 서비스 또는 제3자를 매개로 기대하는 수익이나 결과를 보장하지 않으며,
                서비스에서 제공되는 정보의 신뢰도,
                정확성,
                적시성에 대해 보증하지 않습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제15조 (손해배상)</h2>
              <p>
                회사 또는 회원이 본 약관을 위반하여 상대방에게 손해가 발생한 경우 귀책 당사자는 그 손해를 배상해야 합니다.
              </p>
              <p>
                단,
                회사는 무료로 제공한 서비스와 관련하여 발생한 손해에 대해서는 고의 또는 중대한 과실이 없는 한 책임을 부담하지 않습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제16조 (통지)</h2>
              <p>
                회사가 회원에게 통지를 하는 경우 회원이 등록한 이메일 주소 또는 서비스 내 알림 수단을 통해 할 수 있습니다.
              </p>
              <p>
                회사는 불특정 다수 회원에게 통지할 필요가 있는 경우 7일 이상 서비스 공지사항에 게시함으로써 개별 통지에 갈음할 수 있습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제17조 (준거법 및 재판관할)</h2>
              <p>
                본 약관과 회사와 회원 간에 발생한 분쟁에는 대한민국 법을 준거법으로 합니다.
              </p>
              <p>
                서비스 이용과 관련하여 회사와 회원 사이에 분쟁이 발생한 경우 회사 소재지를 관할하는 법원을 전속 관할로 합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">제18조 (부칙)</h2>
              <p>
                본 약관은 2026년 4월 14일부터 시행되며,
                이전에 시행되던 이용약관은 본 약관으로 대체됩니다.
              </p>
              <p>
                회사는 서비스 특성에 따라 별도의 세부 정책을 제정할 수 있으며,
                세부 정책은 본 약관과 동일한 효력을 가집니다.
              </p>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
