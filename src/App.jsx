import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "./App.css";

const onlyDigits = (v) => v.replace(/\D/g, "");
const maskCpf = (v) =>
  onlyDigits(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (v) =>
  onlyDigits(v).slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");

function validaCpf(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

const PLANOS = [
  { id: "mensal", nome: "Mensal", preco: "R$ 119,90", desc: "Sem fidelidade" },
  { id: "trimestral", nome: "Trimestral", preco: "R$ 99,90", desc: "Por mês, 3 meses" },
  { id: "anual", nome: "Anual", preco: "R$ 79,90", desc: "Por mês, 12 meses" },
];
const UNIDADES = ["Ceilândia", "Taguatinga", "Samambaia", "Asa Norte", "Gama"];

const telRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo")
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  cpf: z.string().refine(validaCpf, "CPF inválido"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido"),
  telefone: z.string().regex(telRegex, "Telefone inválido, use (00) 00000-0000"),
  nascimento: z.string().min(1, "Informe a data de nascimento")
    .refine((v) => !v || new Date(v) <= new Date(), "A data não pode ser futura")
    .refine((v) => !v || new Date(v).getFullYear() > 1900, "Data inválida"),
  unidade: z.string().min(1, "Selecione a unidade"),
  plano: z.string().min(1, "Escolha um plano"),
  pagamento: z.string().min(1, "Selecione a forma de pagamento"),
  emergenciaNome: z.string().trim().min(3, "Informe o nome do contato"),
  emergenciaTelefone: z.string().regex(telRegex, "Telefone inválido"),
  termos: z.boolean().refine((v) => v === true, "É necessário aceitar os termos"),
});

const STEPS = [
  { titulo: "Dados pessoais", campos: ["nome", "cpf", "email", "telefone", "nascimento"] },
  { titulo: "Plano e unidade", campos: ["unidade", "plano", "pagamento"] },
  { titulo: "Contato e termos", campos: ["emergenciaNome", "emergenciaTelefone", "termos"] },
];

function Campo({ label, erro, children }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {children}
      {erro && <small className="erro" role="alert">{erro.message}</small>}
    </label>
  );
}

function NovoAlunoModal({ onClose, onSave, cpfsExistentes }) {
  const [etapa, setEtapa] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const {
    register, handleSubmit, trigger, setValue, setError, getValues, watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      nome: "", cpf: "", email: "", telefone: "", nascimento: "", unidade: "",
      plano: "", pagamento: "", emergenciaNome: "", emergenciaTelefone: "", termos: false,
    },
  });

  const mask = (campo, fn) => ({ onChange: (e) => setValue(campo, fn(e.target.value), { shouldValidate: true }) });

  const avancar = async () => {
    if (await trigger(STEPS[etapa].campos)) setEtapa((e) => e + 1);
  };

  const enviar = (data) => {
    if (cpfsExistentes.includes(data.cpf)) {
      setError("cpf", { message: "Já existe um aluno com este CPF" });
      setEtapa(0);
      return;
    }
    onSave(data);
    setConcluido(true);
  };

  const planoSel = watch("plano");

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {concluido ? (
          <div className="sucesso">
            <div className="check">✓</div>
            <h2>Aluno cadastrado!</h2>
            <p>{getValues("nome")} já aparece na lista como <strong>ativo</strong>.</p>
            <button className="btn primario" onClick={onClose}>Voltar ao painel</button>
          </div>
        ) : (
          <>
            <header className="modal-head">
              <h2>Adicionar aluno</h2>
              <button className="fechar" onClick={onClose} aria-label="Fechar">×</button>
            </header>

            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.titulo} className={i === etapa ? "atual" : i < etapa ? "feito" : ""}>
                  <span>{i < etapa ? "✓" : i + 1}</span>{s.titulo}
                </li>
              ))}
            </ol>

            <form onSubmit={handleSubmit(enviar)} noValidate>
              {etapa === 0 && (
                <div className="grid">
                  <div className="full"><Campo label="Nome completo *" erro={errors.nome}>
                    <input {...register("nome")} placeholder="Ex.: Maria da Silva" />
                  </Campo></div>
                  <Campo label="CPF *" erro={errors.cpf}>
                    <input {...register("cpf", mask("cpf", maskCpf))} placeholder="000.000.000-00" inputMode="numeric" />
                  </Campo>
                  <Campo label="Data de nascimento *" erro={errors.nascimento}>
                    <input type="date" {...register("nascimento")} />
                  </Campo>
                  <Campo label="E-mail *" erro={errors.email}>
                    <input type="email" {...register("email")} placeholder="voce@email.com" />
                  </Campo>
                  <Campo label="Telefone *" erro={errors.telefone}>
                    <input {...register("telefone", mask("telefone", maskPhone))} placeholder="(00) 00000-0000" inputMode="tel" />
                  </Campo>
                </div>
              )}

              {etapa === 1 && (
                <div className="grid">
                  <div className="full"><Campo label="Unidade *" erro={errors.unidade}>
                    <select {...register("unidade")}>
                      <option value="">Selecione...</option>
                      {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </Campo></div>
                  <div className="full">
                    <span className="rotulo">Plano *</span>
                    <div className="planos">
                      {PLANOS.map((p) => (
                        <label key={p.id} className={`plano ${planoSel === p.id ? "sel" : ""}`}>
                          <input type="radio" value={p.id} {...register("plano")} />
                          <strong>{p.nome}</strong><b>{p.preco}</b><small>{p.desc}</small>
                        </label>
                      ))}
                    </div>
                    {errors.plano && <small className="erro">{errors.plano.message}</small>}
                  </div>
                  <div className="full"><Campo label="Forma de pagamento *" erro={errors.pagamento}>
                    <select {...register("pagamento")}>
                      <option value="">Selecione...</option>
                      <option>Cartão de crédito</option>
                      <option>Boleto</option>
                      <option>Pix</option>
                    </select>
                  </Campo></div>
                </div>
              )}

              {etapa === 2 && (
                <div className="grid">
                  <Campo label="Contato de emergência *" erro={errors.emergenciaNome}>
                    <input {...register("emergenciaNome")} placeholder="Nome do contato" />
                  </Campo>
                  <Campo label="Telefone do contato *" erro={errors.emergenciaTelefone}>
                    <input {...register("emergenciaTelefone", mask("emergenciaTelefone", maskPhone))} placeholder="(00) 00000-0000" inputMode="tel" />
                  </Campo>
                  <div className="full resumo">
                    <strong>Resumo</strong>
                    <p>{getValues("nome")} · {getValues("unidade")} · plano {getValues("plano")}</p>
                  </div>
                  <div className="full">
                    <label className="check-termos">
                      <input type="checkbox" {...register("termos")} />
                      Li e aceito os termos de uso e a política de privacidade.
                    </label>
                    {errors.termos && <small className="erro">{errors.termos.message}</small>}
                  </div>
                </div>
              )}

              <footer className="modal-foot">
                {etapa > 0 ? (
                  <button type="button" className="btn" onClick={() => setEtapa(etapa - 1)}>Voltar</button>
                ) : <span />}
                {etapa < STEPS.length - 1 ? (
                  <button type="button" className="btn primario" onClick={avancar}>Continuar</button>
                ) : (
                  <button type="submit" className="btn primario">Cadastrar aluno</button>
                )}
              </footer>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const hoje = () => new Date().toLocaleDateString("sv-SE");
const diasAtras = (d) => Math.max(0, Math.floor((Date.now() - new Date(d + "T12:00:00")) / 864e5));
const iniciais = (n) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const quando = (d) => { const n = diasAtras(d); return n === 0 ? "hoje" : n === 1 ? "ontem" : `há ${n} dias`; };
const curva = (pts) => pts.reduce((d, [x, y], i) => {
  if (!i) return `M${x},${y}`;
  const cx = (pts[i - 1][0] + x) / 2;
  return `${d} C${cx},${pts[i - 1][1]} ${cx},${y} ${x},${y}`;
}, "");

function gerarSeed() {
  const base = [
    ["Mariana Costa", "Ceilândia", "anual", 1, 1], ["Lucas Mendes", "Taguatinga", "mensal", 0, 25],
    ["Ana Beatriz Lima", "Samambaia", "trimestral", 1, 2], ["Pedro Henrique Souza", "Ceilândia", "mensal", 1, 4],
    ["Juliana Alves", "Asa Norte", "anual", 1, 5], ["Rafael Barbosa", "Gama", "trimestral", 1, 7],
    ["Camila Ribeiro", "Ceilândia", "mensal", 0, 9], ["Gabriel Martins", "Taguatinga", "anual", 1, 10],
    ["Fernanda Rocha", "Samambaia", "mensal", 1, 12], ["Thiago Oliveira", "Ceilândia", "trimestral", 1, 14],
    ["Larissa Gomes", "Asa Norte", "mensal", 0, 17], ["Bruno Carvalho", "Gama", "anual", 1, 19],
    ["Patricia Nunes", "Taguatinga", "trimestral", 1, 22], ["Diego Ferreira", "Samambaia", "mensal", 1, 26],
    ["Beatriz Santos", "Ceilândia", "anual", 1, 28],
  ];
  return base.map(([nome, unidade, plano, ativo, dias], i) => ({
    id: i + 1, nome, unidade, plano, ativo: !!ativo,
    email: nome.split(" ")[0].toLowerCase() + "@email.com",
    cpf: `${111 + i}.444.777-${10 + i}`, telefone: "(61) 99999-0000",
    criadoEm: new Date(Date.now() - dias * 864e5).toLocaleDateString("sv-SE"),
  }));
}

const ICONES = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  calendar: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  plus: "M12 5v14M5 12h14",
  menu: "M3 6h18M3 12h18M3 18h18",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  x: "M18 6L6 18M6 6l12 12",
  halter: "M6 7v10M3 10v4M18 7v10M21 10v4M6 12h12",
};
const Icon = ({ n }) => (
  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONES[n]} />
  </svg>
);
const NAV = [["grid", "Dashboard"], ["users", "Alunos"], ["calendar", "Aulas"], ["activity", "Treinos"], ["settings", "Configurações"]];

export default function App() {
  const [alunos, setAlunos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("allpfit-alunos-v2")) ?? gerarSeed(); }
    catch { return gerarSeed(); }
  });
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [aberto, setAberto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [paraRemover, setParaRemover] = useState(null);

  useEffect(() => { localStorage.setItem("allpfit-alunos-v2", JSON.stringify(alunos)); }, [alunos]);

  const lista = useMemo(() => alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) &&
    (filtro === "todos" || (filtro === "ativos" ? a.ativo : !a.ativo))
  ), [alunos, busca, filtro]);

  const s = useMemo(() => {
    const ativos = alunos.filter((a) => a.ativo).length;
    const buckets = Array(10).fill(0);
    alunos.forEach((a) => { const d = diasAtras(a.criadoEm); if (d < 30) buckets[9 - Math.floor(d / 3)]++; });
    const porUnidade = UNIDADES.map((u) => ({ u, n: alunos.filter((a) => a.unidade === u).length }));
    const porPlano = PLANOS.map((p) => ({ ...p, n: alunos.filter((a) => a.plano === p.id).length }));
    const recentes = [...alunos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id - a.id).slice(0, 4);
    return { ativos, novos: buckets.reduce((x, y) => x + y, 0), buckets, porUnidade, porPlano, recentes };
  }, [alunos]);

  const W = 600, H = 180, maxB = Math.max(...s.buckets, 1), maxU = Math.max(...s.porUnidade.map((x) => x.n), 1);
  const pts = s.buckets.map((v, i) => [i * (W / 9), H - 20 - (v / maxB) * (H - 50)]);
  const linha = curva(pts);

  const adicionar = (d) => setAlunos((l) => [{ ...d, id: Date.now(), ativo: true, criadoEm: hoje() }, ...l]);
  const alternar = (id) => setAlunos((l) => l.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)));
  const confirmarRemocao = () => { setAlunos((l) => l.filter((a) => a.id !== paraRemover.id)); setParaRemover(null); };

  return (
    <div className="layout">
      <div className={`overlay-menu ${menu ? "show" : ""}`} onClick={() => setMenu(false)} />
      <aside className={`side ${menu ? "aberto" : ""}`}>
        <div className="marca">
          <span className="marca-ic"><Icon n="halter" /></span>
          <div><strong>allp fit</strong><small>Gestão</small></div>
          <button className="fechar-menu" onClick={() => setMenu(false)} aria-label="Fechar menu"><Icon n="x" /></button>
        </div>
        <nav>
          {NAV.map(([ic, nome], i) => (
            <button key={nome} className={`nav-item ${i === 0 ? "ativo" : "desab"}`} disabled={i !== 0} onClick={() => setMenu(false)} title={i ? "Indisponível na demonstração" : ""}>
              <Icon n={ic} />{nome}
            </button>
          ))}
        </nav>
        <button className="nav-item desab side-foot" disabled><Icon n="logout" />Sair</button>
      </aside>

      <div className="main">
        <header className="topo">
          <button className="ic-btn hamb" onClick={() => setMenu(true)} aria-label="Abrir menu"><Icon n="menu" /></button>
          <h2>Bem-vindo de volta!</h2>
          <button className="ic-btn desab" disabled aria-label="Notificações"><Icon n="bell" /></button>
          <span className="avatar desab">AD</span>
        </header>

        <main className="conteudo">
          <div className="titulo-linha">
            <h1>Visão geral</h1>
            <div className="acoes">
              <button className="btn desab" disabled><Icon n="calendar" />Agendar aula</button>
              <button className="btn primario" onClick={() => setAberto(true)}><Icon n="plus" />Adicionar aluno</button>
            </div>
          </div>

          <section className="cards">
            <div className="card"><span>Total de alunos</span><strong>{alunos.length}</strong><small className="ok">+{s.novos} nos últimos 30 dias</small></div>
            <div className="card"><span>Alunos ativos</span><strong>{s.ativos}</strong><small className="ok">{alunos.length ? Math.round((s.ativos / alunos.length) * 100) : 0}% do total</small></div>
            <div className="card"><span>Alunos inativos</span><strong>{alunos.length - s.ativos}</strong><small className="off">Aguardando reativação</small></div>
            <div className="card"><span>Cadastros no mês</span><strong>{s.novos}</strong><small className="ok">Últimos 30 dias</small></div>
          </section>

          <section className="graficos">
            <div className="box">
              <h3>Novos cadastros ao longo do tempo</h3>
              <div className="big">{s.novos} <small>Últimos 30 dias</small></div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="area">
                <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff6a00" stopOpacity=".25" /><stop offset="1" stopColor="#ff6a00" stopOpacity="0" /></linearGradient></defs>
                <path d={`${linha} L${W},${H} L0,${H} Z`} fill="url(#g)" />
                <path d={linha} fill="none" stroke="#ff6a00" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="eixo"><span>Semana 1</span><span>Semana 2</span><span>Semana 3</span><span>Semana 4</span></div>
            </div>
            <div className="box">
              <h3>Alunos por unidade</h3>
              <div className="big">{alunos.length} <small>Total</small></div>
              <div className="barras">
                {s.porUnidade.map(({ u, n }) => (
                  <div key={u} className="barra-col">
                    <b>{n}</b><div className="barra" style={{ height: `${(n / maxU) * 100}%` }} /><span>{u}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="listas">
            <div className="box">
              <h3>Distribuição de planos</h3>
              {s.porPlano.map((p) => (
                <div key={p.id} className="plano-linha">
                  <div><strong>{p.nome}</strong><small>{p.preco}</small></div>
                  <div className="trilha"><i style={{ width: `${alunos.length ? (p.n / alunos.length) * 100 : 0}%` }} /></div>
                  <span>{p.n}</span>
                </div>
              ))}
            </div>
            <div className="box">
              <h3>Últimos cadastros</h3>
              {s.recentes.map((a) => (
                <div key={a.id} className="recente">
                  <span className="avatar">{iniciais(a.nome)}</span>
                  <strong>{a.nome}</strong><small>{quando(a.criadoEm)}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="box tabela-box">
            <div className="tabela-topo">
              <h3>Alunos cadastrados</h3>
              <div className="filtros">
                <label className="busca">
                  <Icon n="search" />
                  <input placeholder="Buscar aluno por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </label>
                <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                  <option value="todos">Todos</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option>
                </select>
              </div>
            </div>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th>Aluno</th><th className="hide-sm">Unidade</th><th>Plano</th><th className="hide-sm">Cadastro</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.id}>
                      <td className="aluno"><span className="avatar">{iniciais(a.nome)}</span><div><strong>{a.nome}</strong><small>{a.email}</small></div></td>
                      <td className="hide-sm">{a.unidade}</td>
                      <td className="cap">{a.plano}</td>
                      <td className="hide-sm">{quando(a.criadoEm)}</td>
                      <td><button className={`badge ${a.ativo ? "ativo" : "inativo"}`} onClick={() => alternar(a.id)} title="Clique para alterar">{a.ativo ? "Ativo" : "Inativo"}</button></td>
                      <td><button className="btn-remover" onClick={() => setParaRemover(a)}><Icon n="trash" />Remover</button></td>
                    </tr>
                  ))}
                  {lista.length === 0 && <tr><td colSpan="6" className="vazio">Nenhum aluno encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <p className="nota">Projeto demonstrativo. Dados fictícios, salvos no navegador (localStorage).</p>
        </main>
      </div>

      {aberto && <NovoAlunoModal onClose={() => setAberto(false)} onSave={adicionar} cpfsExistentes={alunos.map((a) => a.cpf)} />}

      {paraRemover && (
        <div className="overlay" onClick={() => setParaRemover(null)}>
          <div className="modal confirma" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="confirma-ic"><Icon n="trash" /></div>
            <h2>Remover aluno?</h2>
            <p><strong>{paraRemover.nome}</strong> será removido da lista. Essa ação não pode ser desfeita.</p>
            <div className="confirma-acoes">
              <button className="btn" onClick={() => setParaRemover(null)}>Cancelar</button>
              <button className="btn perigo" onClick={confirmarRemocao}>Sim, remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
