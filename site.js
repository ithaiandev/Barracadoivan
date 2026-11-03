// Barraca do Ivan — comportamento comum a todas as páginas

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('open');
  document.documentElement.classList.add('sem-rolagem');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.documentElement.classList.remove('sem-rolagem');
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

// abas do cardápio (página cardapio.html)
function switchTab(id, btn) {
  const painel = document.getElementById('tab-' + id);
  if (!painel) return;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  painel.classList.add('active');
  btn.classList.add('active');
}

// sem JS inline no HTML (a Content-Security-Policy bloqueia): os cliques
// de fechar a foto, ampliar o cardápio e trocar de aba são tratados aqui
document.addEventListener('click', function(e) {
  if (e.target.closest('#lightbox')) { closeLightbox(); return; }
  const ampliar = e.target.closest('[data-ampliar]');
  if (ampliar) {
    const img = ampliar.querySelector('img');
    if (img) openLightbox(img.currentSrc || img.src);
    return;
  }
  const aba = e.target.closest('.tab-btn[data-tab]');
  if (aba) switchTab(aba.dataset.tab, aba);
});

// ao arrastar um carrossel com o dedo, alguns celulares disparam um "clique" no fim;
// guardamos onde o toque comecou para nao abrir a foto ampliada sem querer
let toqueInicio = null, arrastou = false;
document.addEventListener('pointerdown', e => { toqueInicio = { x: e.clientX, y: e.clientY }; arrastou = false; }, { passive: true });
document.addEventListener('pointermove', e => {
  if (toqueInicio && Math.hypot(e.clientX - toqueInicio.x, e.clientY - toqueInicio.y) > 10) arrastou = true;
}, { passive: true });
document.querySelectorAll('.trilho, .faixa-fotos').forEach(t => t.addEventListener('scroll', () => { arrastou = true; }, { passive: true }));

// clique em qualquer foto de conteudo amplia (links, botoes, cabecalho, rodape e fundos ficam de fora)
document.addEventListener('click', function(e) {
  const img = e.target.closest('img');
  if (!img) return;
  if (arrastou && img.closest('.trilho, .faixa-fotos')) { arrastou = false; return; }
  if (img.id === 'lightbox-img') return;
  if (img.closest('header, footer, a, button, .hero, .chamada')) return;
  openLightbox(img.currentSrc || img.src);
});

// setas dos carrosseis: cada clique leva a proxima (ou anterior) parada exata do
// encaixe, entao a foto sempre termina centralizada. Cliques rapidos se somam
// (contam a partir do destino, nao do meio do caminho). Na primeira e na ultima
// foto a seta daquele lado fica apagada; se todas as fotos cabem, as setas somem.
document.querySelectorAll('.carrossel').forEach(function(c) {
  const trilho = c.querySelector('.trilho');
  if (!trilho) return;
  const fotos = Array.from(trilho.children);
  const esq = c.querySelector('.esq'), dir = c.querySelector('.dir');
  let paradas = [], alvo = -1, paradoTimer, segurancaTimer;

  const medirParadas = () => {
    const max = trilho.scrollWidth - trilho.clientWidth;
    paradas = [];
    fotos.forEach(f => {
      const p = Math.round(Math.max(0, Math.min(max, f.offsetLeft - (trilho.clientWidth - f.offsetWidth) / 2)));
      if (!paradas.length || p - paradas[paradas.length - 1] > 2) paradas.push(p);
    });
    c.classList.toggle('cabe', paradas.length < 2);
  };
  const maisPerto = () => {
    let melhor = 0;
    paradas.forEach((p, i) => { if (Math.abs(p - trilho.scrollLeft) < Math.abs(paradas[melhor] - trilho.scrollLeft)) melhor = i; });
    return melhor;
  };
  const atualizarSetas = () => {
    const i = alvo >= 0 ? alvo : maisPerto();
    esq.disabled = i <= 0;
    dir.disabled = i >= paradas.length - 1;
  };
  const terminar = () => {
    clearTimeout(paradoTimer); clearTimeout(segurancaTimer);
    trilho.classList.remove('navegando'); alvo = -1; atualizarSetas();
  };
  const ir = sentido => {
    medirParadas();
    const base = alvo >= 0 ? alvo : maisPerto();
    const novo = Math.max(0, Math.min(paradas.length - 1, base + sentido));
    if (novo === base) return;
    alvo = novo;
    trilho.classList.add('navegando');
    trilho.scrollTo({ left: paradas[alvo], behavior: 'smooth' });
    atualizarSetas();
    // o encaixe so volta quando a rolagem realmente parou (ver o "scroll" abaixo);
    // a seguranca cobre o caso de a rolagem nem comecar
    clearTimeout(segurancaTimer);
    segurancaTimer = setTimeout(terminar, 2500);
  };
  trilho.addEventListener('scroll', () => {
    if (alvo < 0) { clearTimeout(paradoTimer); paradoTimer = setTimeout(atualizarSetas, 120); return; }
    // a rolagem das setas acabou quando chega no destino ou fica 200ms sem se mexer
    clearTimeout(paradoTimer);
    if (Math.abs(trilho.scrollLeft - paradas[alvo]) < 2) terminar();
    else paradoTimer = setTimeout(terminar, 200);
  }, { passive: true });
  // se a pessoa encosta no carrossel no meio da animacao, ela assume o controle
  trilho.addEventListener('pointerdown', () => { if (alvo >= 0) terminar(); }, { passive: true });
  trilho.addEventListener('wheel', () => { if (alvo >= 0) terminar(); }, { passive: true });

  esq.addEventListener('click', () => ir(-1));
  dir.addEventListener('click', () => ir(1));
  medirParadas(); atualizarSetas();
  window.addEventListener('resize', () => { medirParadas(); atualizarSetas(); }, { passive: true });
});

// menu andando: repete os links ate cobrir a largura e duplica tudo, assim o
// loop volta ao inicio sem emenda. Anda sozinho; com o dedo ou o mouse a pessoa
// arrasta para os dois lados e, ao soltar, ele continua de onde ficou
const menu = document.getElementById('menu');
if (menu && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const menuTrilho = menu.querySelector('.menu-trilho');
  const linksOriginais = Array.from(menuTrilho.children);
  const VELOCIDADE = 45; // px por segundo
  let ciclo = 0, x = 0, segurando = false, mouseEmCima = false, comFoco = false;
  let inicioX = 0, inicioPos = 0, menuArrastou = false, ultimo = 0;

  const encaixar = () => {
    if (!ciclo) return;
    x = ((x % ciclo) - ciclo) % ciclo; // mantem x entre -ciclo e 0
    menuTrilho.style.transform = `translate3d(${x}px,0,0)`;
  };
  const montarMenu = () => {
    menuTrilho.replaceChildren(...linksOriginais);
    const larguraGrupo = menuTrilho.scrollWidth;
    if (!larguraGrupo) return;
    const repeticoes = Math.max(1, Math.ceil(menu.clientWidth / larguraGrupo));
    for (let i = 1; i < repeticoes * 2; i++) {
      linksOriginais.forEach(a => {
        const copia = a.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');
        copia.setAttribute('tabindex', '-1');
        copia.removeAttribute('aria-current');
        menuTrilho.appendChild(copia);
      });
    }
    ciclo = larguraGrupo * repeticoes;
    menuTrilho.querySelectorAll('a').forEach(a => a.setAttribute('draggable', 'false'));
    menu.classList.add('andando');
    encaixar();
  };
  const passo = t => {
    const dt = ultimo ? Math.min((t - ultimo) / 1000, 0.1) : 0;
    ultimo = t;
    if (ciclo && !segurando && !mouseEmCima && !comFoco) { x -= VELOCIDADE * dt; encaixar(); }
    requestAnimationFrame(passo);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { montarMenu(); requestAnimationFrame(passo); });
  // so remonta quando a largura muda: no celular a barra de endereco aparece e
  // some ao rolar (muda so a altura) e isso nao deve refazer o menu
  let menuTimer, larguraMenu = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === larguraMenu) return;
    larguraMenu = window.innerWidth;
    clearTimeout(menuTimer); menuTimer = setTimeout(montarMenu, 200);
  });

  // arrastar com dedo ou mouse
  menu.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    segurando = true; menuArrastou = false;
    inicioX = e.clientX; inicioPos = x;
  });
  menu.addEventListener('pointermove', e => {
    if (!segurando) return;
    const dx = e.clientX - inicioX;
    if (!menuArrastou && Math.abs(dx) > 6) {
      menuArrastou = true;
      menu.classList.add('arrastando');
      try { menu.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (menuArrastou) { x = inicioPos + dx; encaixar(); }
  });
  const soltar = () => {
    if (!segurando) return;
    segurando = false; menu.classList.remove('arrastando');
    // o clique que vem logo depois do soltar ja foi barrado; o proximo vale
    setTimeout(() => { menuArrastou = false; }, 0);
  };
  // soltar em qualquer lugar da pagina conta (o mouse pode sair da faixa antes)
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  // no toque o link segura o dedo primeiro e o "perde" quando a faixa o captura:
  // so conta como soltar quando quem perdeu foi a propria faixa
  menu.addEventListener('lostpointercapture', e => { if (e.target === menu) soltar(); });
  // depois de arrastar, soltar em cima de um link nao abre o link
  menu.addEventListener('click', e => { if (menuArrastou) { e.preventDefault(); e.stopPropagation(); } }, true);
  // roda/touchpad de lado no notebook tambem move a faixa
  menu.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); x -= e.deltaX; encaixar();
  }, { passive: false });
  // com o mouse parado em cima (para clicar) ou navegando pelo teclado, a faixa espera
  menu.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') mouseEmCima = true; });
  menu.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouseEmCima = false; });
  menu.addEventListener('focusin', e => {
    // so o foco do teclado (Tab) segura a faixa; toque/clique deixam ela andar
    try { comFoco = e.target.matches(':focus-visible'); } catch (_) { comFoco = false; }
  });
  menu.addEventListener('focusout', () => { comFoco = false; });
}

// o video de divulgacao tem som: garante que ele nunca toque mudo
// e pausa quando a pessoa rola para longe dele
const videoDivulgacao = document.getElementById('video-divulgacao');
if (videoDivulgacao) {
  videoDivulgacao.muted = false;
  videoDivulgacao.volume = 1;
  videoDivulgacao.addEventListener('play', () => { videoDivulgacao.muted = false; });
  // capa e inicio do video so carregam quando a pessoa rola perto dele:
  // assim nao disputam a internet com o video do topo na abertura do site
  const prepararDivulgacao = () => {
    if (videoDivulgacao.dataset.poster) { videoDivulgacao.poster = videoDivulgacao.dataset.poster; delete videoDivulgacao.dataset.poster; }
    if (videoDivulgacao.preload === 'none') videoDivulgacao.preload = 'metadata';
  };
  videoDivulgacao.addEventListener('play', prepararDivulgacao, { once: true });
  if ('IntersectionObserver' in window) {
    const perto = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { prepararDivulgacao(); perto.disconnect(); }
    }, { rootMargin: '600px 0px' });
    perto.observe(videoDivulgacao);
  } else prepararDivulgacao();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(e => { if (!e.isIntersecting && !videoDivulgacao.paused) videoDivulgacao.pause(); });
    }, { threshold: 0.25 }).observe(videoDivulgacao);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) videoDivulgacao.pause(); });
}

// cabecalho fica solido depois que sai da foto/video do topo
const topo = document.getElementById('topo');
const heroTopo = document.querySelector('.hero');
if (topo) {
  // a altura do topo e medida so ao abrir e ao mudar o tamanho da tela,
  // nao a cada movimento da rolagem
  let limite = 0;
  const medir = () => { limite = heroTopo ? heroTopo.offsetHeight * 0.6 : 0; };
  const ajustarTopo = () => topo.classList.toggle('solido', window.scrollY > limite);
  medir(); ajustarTopo();
  window.addEventListener('scroll', ajustarTopo, { passive: true });
  window.addEventListener('resize', () => { medir(); ajustarTopo(); }, { passive: true });
  window.addEventListener('load', () => { medir(); ajustarTopo(); }, { once: true });
}

// quem pediu menos movimento ou economia de dados fica so com a imagem de capa
const heroVideo = document.getElementById('hero-video');
const economia = navigator.connection && navigator.connection.saveData;
if (heroVideo && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || economia)) {
  heroVideo.pause();
  heroVideo.remove();
} else if (heroVideo) {
  // o video comeca escondido atras da foto de capa e so aparece quando esta
  // rodando de verdade; se a rede engasgar, a capa volta por cima (ninguem ve
  // o video congelado). O play e dado logo: o Safari do iPhone nao carrega o
  // video antes do play, entao esperar "carregar tudo" deixaria ele parado.
  let naTela = true;
  const mostrar = () => { if (!heroVideo.paused) heroVideo.classList.add('pronto'); };
  const esconder = () => heroVideo.classList.remove('pronto');
  const tocar = () => { if (naTela) heroVideo.play().catch(() => {}); };
  heroVideo.addEventListener('playing', mostrar);
  heroVideo.addEventListener('timeupdate', mostrar);
  heroVideo.addEventListener('waiting', esconder);
  // o video ja comeca a baixar junto com a pagina (preload="auto" no HTML)
  // e o play e pedido na hora: ele aparece assim que tiver o primeiro trecho
  tocar();
  // fora da tela o video pausa (poupa bateria e internet) e volta ao reaparecer
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        naTela = e.isIntersecting;
        if (!naTela) heroVideo.pause();
        else tocar();
      });
    }).observe(heroVideo);
  }
}

// prepara as animacoes de entrada: numera os itens de cada bloco para entrarem em
// sequencia e, no computador, faz as colunas da esquerda/direita entrarem pelos lados
document.querySelectorAll('.faixa-fotos, .trilho, .menus, .gallery-grid').forEach(g => g.classList.add('anima-grupo'));
const ladoALado = window.matchMedia('(min-width: 761px)').matches;
document.querySelectorAll('.sr, .anima-grupo').forEach(bloco => {
  const itens = Array.from(bloco.children);
  const caixa = bloco.getBoundingClientRect();
  itens.forEach((item, i) => {
    item.style.setProperty('--i', Math.min(i, 5));
    if (!ladoALado || !bloco.classList.contains('sr')) return;
    const r = item.getBoundingClientRect();
    if (r.width > caixa.width * 0.7) return; // ocupa a largura toda: so sobe
    item.classList.add(r.left + r.width / 2 < caixa.left + caixa.width / 2 ? 'vem-esq' : 'vem-dir');
  });
});

const srEls = document.querySelectorAll('.sr, .anima-grupo');
const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (semAnimacao || !('IntersectionObserver' in window)) {
  srEls.forEach(el => el.classList.add('visible'));
} else {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
  srEls.forEach(el => obs.observe(el));
}
