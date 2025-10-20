export default function CadastrarPage() {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-yellow-400">Cadastrar Usuário</h2>
        <p className="text-gray-400">
          O cadastro é opcional — você pode acessar todas as funções sem criar conta.
        </p>
  
        <form className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col gap-4 max-w-md">
          <input
            type="text"
            placeholder="Nome completo"
            className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="email"
            placeholder="E-mail"
            className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold p-3 rounded-lg transition"
          >
            Cadastrar
          </button>
        </form>
      </div>
    );
  }
  