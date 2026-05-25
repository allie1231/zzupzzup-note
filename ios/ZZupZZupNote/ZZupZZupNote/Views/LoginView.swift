import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var store: ClipStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("줍줍노트")
                .font(.system(size: 44, weight: .black))

            Text("Supabase 계정으로 로그인하면 웹홈, 문장, 사진에 저장된 자료를 앱에서도 볼 수 있습니다.")
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                TextField("이메일", text: $store.email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)

                SecureField("비밀번호", text: $store.password)
                    .textContentType(.password)
                    .textFieldStyle(.roundedBorder)
            }

            Button {
                Task { await store.signIn() }
            } label: {
                Label("로그인하고 서버 불러오기", systemImage: "tray.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(store.isLoading)

            Text(store.message)
                .font(.footnote)
                .foregroundStyle(.secondary)

            Spacer()
        }
        .padding(24)
    }
}

