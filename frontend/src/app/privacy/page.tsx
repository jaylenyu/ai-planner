import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보 처리방침 | DatePlanner',
  description: 'DatePlanner 개인정보 처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-10 shadow-xl shadow-stone-200/60">
          <header className="mb-10 border-b border-stone-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">DatePlanner Privacy</p>
            <h1 className="mt-3 text-3xl font-extrabold text-stone-900">개인정보 처리방침</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              DatePlanner(이하 &quot;회사&quot;)는 이용자의 개인정보를 중요하게 생각하며,
              개인정보 보호법,
              정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령을 준수합니다.
              회사는 개인정보 처리방침을 통하여 이용자에게 개인정보가 어떠한 목적과 방식으로 수집,
              이용,
              보관,
              파기되는지를 명확히 안내합니다.
            </p>
            <p className="mt-1 text-xs text-stone-400">시행일자: 2026년 4월 14일</p>
          </header>

          <section className="space-y-8 text-sm leading-relaxed text-stone-700">
            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">1. 수집하는 개인정보 항목</h2>
              <p>회사는 서비스 제공을 위해 다음과 같은 정보를 수집합니다.</p>
              <h3 className="mt-3 text-base font-semibold text-stone-900">1) 회원 가입 시</h3>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>필수 정보: 이메일 주소,
                  비밀번호,
                  인증코드,
                  닉네임(선택 입력 시)</li>
                <li>OAuth 가입 시: 제공자 식별자,
                  인증된 이메일,
                  프로필 이미지 URL (제공자 정책상 제공되는 경우)</li>
              </ul>
              <h3 className="mt-4 text-base font-semibold text-stone-900">2) 서비스 이용 시 자동 수집</h3>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>접속 기록,
                  IP 주소,
                  브라우저 정보,
                  디바이스 식별 값,
                  이용자의 요청 본문 및 응답 상태</li>
                <li>쿠키 및 비슷한 기술을 통한 서비스 이용 기록</li>
              </ul>
              <h3 className="mt-4 text-base font-semibold text-stone-900">3) 고객지원 및 상담 시</h3>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>문의 내용,
                  이메일 주소,
                  스크린샷 등 추가로 제공한 자료</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">2. 개인정보의 수집 및 이용 목적</h2>
              <p>회사는 수집한 개인정보를 다음 목적에 한하여 이용합니다.</p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>회원 식별,
                  가입 의사 확인,
                  중복 가입 방지 등 계정 관리</li>
                <li>AI 추천,
                  일정 저장,
                  알림 등 핵심 서비스 기능 제공</li>
                <li>불법 이용 방지,
                  보안 위협 탐지,
                  로그인 시도 제한 등 서비스 안전성 확보</li>
                <li>고객 문의 응대,
                  공지사항 전달,
                  서비스 정책 변경 안내</li>
                <li>사용 통계 분석,
                  서비스 품질 개선,
                  신규 기능 개발</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">3. 개인정보의 보유 및 이용 기간</h2>
              <p>
                회사는 개인정보 수집 및 이용 목적이 달성되면 지체 없이 파기합니다.
                다만 관련 법령에 따라 일정 기간 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년</li>
                <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년</li>
                <li>웹사이트 접속 로그: 3개월 (통신비밀보호법)</li>
              </ul>
              <p>
                회원 탈퇴 시에는 지체 없이 개인정보를 파기하며,
                법령상 의무 보관이 필요한 정보는 별도 저장소에서 분리 보관합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">4. 개인정보의 제3자 제공</h2>
              <p>
                회사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                다만 아래의 경우는 예외로 합니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>이용자가 사전에 공개 또는 제3자 제공에 동의한 경우</li>
                <li>법령에 의거하거나 수사기관의 적법한 절차에 따른 요청이 있는 경우</li>
                <li>서비스 제공에 반드시 필요한 범위에서 특정 기업과 데이터를 공유해야 하는 경우 (사전에 고지 후 동의 절차 진행)</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">5. 개인정보의 처리 위탁</h2>
              <p>
                회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리를 위탁할 수 있습니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>클라우드 인프라 및 데이터베이스 운영: AWS,
                  Vercel 등</li>
                <li>이메일 및 알림 전송: AWS SES,
                  기타 전문 발송 대행사</li>
                <li>로그,
                  모니터링,
                  분석 도구: PostHog,
                  Sentry 등</li>
              </ul>
              <p>
                위탁 계약 시 개인정보 보호법 제26조에 따라 수탁자의 책임과 안전성 확보 조치를 명확히 규정하며,
                수탁자가 개인정보를 안전하게 처리하도록 관리 감독합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">6. 쿠키(Cookie)의 이용</h2>
              <p>
                회사는 개인 맞춤 서비스를 제공하기 위해 쿠키를 사용합니다.
                쿠키는 서비스를 운영하는 데 사용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며,
                이용자의 디바이스에 저장될 수 있습니다.
              </p>
              <p>이용자는 브라우저 설정에서 쿠키 저장을 허용하거나 거부할 수 있습니다.</p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>쿠키 허용: DatePlanner에 최적화된 추천과 이용 환경 제공</li>
                <li>쿠키 차단: 일부 맞춤형 기능 이용에 제한이 있을 수 있음</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">7. 이용자의 권리와 행사 방법</h2>
              <p>
                이용자는 언제든지 자신의 개인정보를 열람하거나 정정,
                삭제,
                처리 정지를 요구할 수 있습니다.
              </p>
              <p>
                개인정보 열람 또는 처리 정지 요청은 법령에 따라 제한될 수 있으며,
                회사는 지체 없이 필요한 조치를 취하고 결과를 안내합니다.
              </p>
              <p>
                이용자는 서비스 내 설정 페이지,
                고객센터 이메일을 통해 권리를 행사할 수 있습니다.
              </p>
              <p>
                만 14세 미만 아동의 경우 개인정보 제공과 권리 행사는 법정대리인을 통해 이루어져야 합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">8. 개인정보의 파기 절차 및 방법</h2>
              <p>
                회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 개인정보를 파기합니다.
              </p>
              <p>
                전자적 파일 형태의 정보는 복구가 불가능하도록 안전한 방법으로 삭제하며,
                출력물 등의 기록은 분쇄 또는 소각을 통해 파기합니다.
              </p>
              <p>
                법령에 따라 일정 기간 저장해야 하는 경우에는 별도의 DB로 옮겨 비공개 상태로 보관합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">9. 개인정보의 안전성 확보 조치</h2>
              <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 하고 있습니다.</p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>데이터 암호화: 비밀번호,
                  인증 토큰 등의 중요 정보는 암호화하여 저장</li>
                <li>접근 통제: 개인정보에 접근할 수 있는 인원을 최소화하고 접근 권한을 엄격히 관리</li>
                <li>보안 점검: 정기적인 취약점 점검과 침해 사고 대응 훈련 시행</li>
                <li>네트워크 보안: 방화벽,
                  WAF,
                  TLS 암호화 통신 도입</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">10. 국외 이전에 관한 사항</h2>
              <p>
                회사는 글로벌 클라우드 인프라를 활용하여 서비스를 운영할 수 있으며,
                이 과정에서 개인정보가 국외로 이전될 수 있습니다.
              </p>
              <p>
                국외 이전이 발생하는 경우 관련 법령에서 요구하는 절차와 안전성 확보 조치를 준수하고,
                이전 대상,
                국가,
                이전 일시,
                보유 기간 등을 이용자에게 사전 고지합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">11. 이용자 및 법정대리인의 권리</h2>
              <p>
                이용자와 법정대리인은 언제든지 개인정보 열람,
                정정,
                삭제,
                처리 정지 요구를 할 수 있으며,
                회사는 지체 없이 이에 응합니다.
              </p>
              <p>
                권리 행사는 서면,
                이메일,
                고객센터 등으로 요청할 수 있으며,
                대리인을 통해서도 가능합니다.
              </p>
              <p>
                회사는 정당한 권리 행사를 거부하지 않으며,
                열람 또는 처리 정지 요청이 법령에 위반되는 경우에는 그 사유를 명확히 안내합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">12. 개인정보 보호책임자 및 담당자</h2>
              <p>회사는 개인정보 보호와 관련한 업무를 총괄하는 개인정보 보호책임자를 지정하고 있습니다.</p>
              <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">개인정보 보호책임자</p>
                <p>이름: 김다정</p>
                <p>직책: CPO / 보안 총괄</p>
                <p>이메일: privacy@dayplan.com</p>
              </div>
              <p className="mt-3">
                이용자는 서비스를 이용하며 발생하는 모든 개인정보 보호 관련 문의,
                불만 처리,
                피해 구제 등을 개인정보 보호책임자에게 요청할 수 있습니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">13. 권익침해 구제 방법</h2>
              <p>
                이용자는 개인정보 침해에 대한 피해를 구제받기 위하여 개인정보 분쟁조정위원회,
                개인정보 침해신고센터 등에 분쟁 해결이나 상담을 신청할 수 있습니다.
              </p>
              <ul className="ml-6 list-disc space-y-1 text-stone-600">
                <li>개인정보 침해신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
                <li>개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
                <li>대검찰청 사이버수사과 (spo.go.kr / 국번 없이 1301)</li>
                <li>경찰청 사이버수사국 (cyberbureau.police.go.kr / 국번 없이 182)</li>
              </ul>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">14. 개인정보 처리방침의 변경</h2>
              <p>
                회사는 법령 또는 서비스 정책 변경에 따라 개인정보 처리방침을 개정할 수 있으며,
                개정 내용과 시행일을 최소 7일 전에 공지합니다.
              </p>
              <p>
                이용자가 개정된 처리방침에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
                별도의 의사 표시가 없으면 변경된 내용에 동의한 것으로 간주합니다.
              </p>
            </article>

            <article>
              <h2 className="mb-3 text-xl font-bold text-stone-900">15. 부칙</h2>
              <p>
                본 개인정보 처리방침은 2026년 4월 14일부터 적용되며,
                이전에 시행되던 처리방침은 본 방침으로 대체됩니다.
              </p>
              <p>
                회사는 개인정보 보호를 위해 필요한 경우 별도의 추가 정책을 수립할 수 있으며,
                추가 정책은 본 방침과 동일한 효력을 갖습니다.
              </p>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
