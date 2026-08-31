import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBTJFQCFgBcV0Dhxr6kIXio3uBEDdzPSEk",
    authDomain: "nutri-life-9f3dc.firebaseapp.com",
    projectId: "nutri-life-9f3dc",
    storageBucket: "nutri-life-9f3dc.firebasestorage.app",
    messagingSenderId: "428459962006",
    appId: "1:428459962006:web:519e8177febf5bc6701cb7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const hoursToggle = document.getElementById('hours-toggle');
const hoursContent = document.getElementById('hours-content');
const hoursArrow = document.getElementById('hours-arrow');
if (hoursToggle) {
    hoursToggle.addEventListener('click', () => {
        if (hoursContent.style.display === 'block') { hoursContent.style.display = 'none'; hoursArrow.innerHTML = '<i class="fa-solid fa-chevron-down"></i>'; } 
        else { hoursContent.style.display = 'block'; hoursArrow.innerHTML = '<i class="fa-solid fa-chevron-up"></i>'; }
    });
}

let lojaAberta = true; 
let configDelivery = { habilitado: false };
let taxasDisponiveis = []; let promocoesDisponiveis = []; let cupomAtivo = null; 
let lojaTelefone = ''; let chavePixLoja = ''; 
let configLojaDados = null; // Guarda os dados para o relógio ler

let unsubscribePedido = null;
window.fecharStatusWidget = function() { document.getElementById('order-status-widget').style.display = 'none'; }
function escutarStatusPedido(idPedido) {
    if(unsubscribePedido) unsubscribePedido();
    unsubscribePedido = onSnapshot(doc(db, "pedidos", idPedido), (docSnap) => {
        if (docSnap.exists()) {
            const pedido = docSnap.data();
            const widget = document.getElementById('order-status-widget'); const icon = document.getElementById('order-status-icon'); const text = document.getElementById('order-status-text');
            widget.style.display = 'flex';
            if (pedido.status === 'novo') { widget.style.borderLeftColor = 'var(--color-new)'; icon.innerHTML = '🕒'; text.innerText = 'Recebido (Aguardando)'; } 
            else if (pedido.status === 'preparo') { widget.style.borderLeftColor = 'var(--color-prep)'; icon.innerHTML = '🍳'; text.innerText = 'Em Preparo na Cozinha'; } 
            else if (pedido.status === 'pronto') { widget.style.borderLeftColor = 'var(--color-ready)'; icon.innerHTML = pedido.tipo_entrega === 'Delivery' ? '🛵' : '🛍️'; text.innerText = pedido.tipo_entrega === 'Delivery' ? 'Saiu para Entrega!' : 'Pronto para Retirada!'; } 
            else if (pedido.status === 'arquivado') { widget.style.borderLeftColor = 'var(--text-muted)'; icon.innerHTML = '✅'; text.innerText = 'Pedido Finalizado!'; setTimeout(() => { widget.style.display = 'none'; localStorage.removeItem('meuPedidoNutriLife'); }, 5000); }
        }
    });
}

const pedidoAtivoId = localStorage.getItem('meuPedidoNutriLife');
if (pedidoAtivoId) escutarStatusPedido(pedidoAtivoId);

// ==========================================
// MUDANÇA: INTELIGÊNCIA DE HORÁRIOS
// ==========================================
function checarHorarioAutomatizado() {
    if (!configLojaDados) return;

    // Se a chave geral foi desligada no painel, fecha imediatamente (Botão de Emergência)
    if (configLojaDados.status_loja === false) {
        lojaAberta = false;
        atualizarVisualLoja(false);
        return;
    }

    const agora = new Date();
    const diaSemana = agora.getDay(); // 0: Dom, 1-5: Seg-Sex, 6: Sab
    const minutosAtual = agora.getHours() * 60 + agora.getMinutes();

    let stringDoDia = "";
    if (diaSemana === 0) stringDoDia = configLojaDados.hr_domingo || "";
    else if (diaSemana === 6) stringDoDia = configLojaDados.hr_sabado || "";
    else stringDoDia = configLojaDados.hr_semana || "";

    // Se estiver escrito "Fechado" no campo do dia, fecha
    if (!stringDoDia || stringDoDia.toLowerCase().includes('fechado')) {
        lojaAberta = false;
        atualizarVisualLoja(false);
        return;
    }

    // Procura por números no formato HH:MM (ex: 08:00 às 20:00)
    const horasEncontradas = stringDoDia.match(/(\d{1,2}):(\d{2})/g);
    
    if (horasEncontradas && horasEncontradas.length >= 2) {
        const [hAbre, mAbre] = horasEncontradas[0].split(':').map(Number);
        const [hFecha, mFecha] = horasEncontradas[1].split(':').map(Number);
        
        const minutosAbre = hAbre * 60 + mAbre;
        const minutosFecha = hFecha * 60 + mFecha;

        // Regra para lojas que abrem de dia e fecham de madrugada (ex: 18:00 às 02:00)
        if (minutosFecha <= minutosAbre) {
            lojaAberta = (minutosAtual >= minutosAbre || minutosAtual <= minutosFecha);
        } else {
            // Regra normal (ex: 08:00 às 20:00)
            lojaAberta = (minutosAtual >= minutosAbre && minutosAtual < minutosFecha);
        }
    } else {
        // Se escreveu algo sem horário legível (ex: "Aberto 24h"), deixa aberto
        lojaAberta = true;
    }

    atualizarVisualLoja(lojaAberta);
}

function atualizarVisualLoja(estaAberta) {
    const bannerFechado = document.getElementById('loja-fechada-banner');
    const btnViewCart = document.querySelector('.btn-view-cart');
    if (!estaAberta) { 
        bannerFechado.style.display = 'block'; 
        btnViewCart.style.backgroundColor = '#ccc';
        btnViewCart.innerText = 'Loja Fechada';
    } else { 
        bannerFechado.style.display = 'none';
        atualizarBarraCarrinho(); // Retorna o visual original do carrinho
    }
}

// O relógio verifica os horários a cada 1 minuto (60000 ms)
setInterval(checarHorarioAutomatizado, 60000);
// ==========================================

onSnapshot(doc(db, "loja", "configuracoes"), (docSnap) => {
    if (docSnap.exists()) {
        configLojaDados = docSnap.data(); // Guarda para o relógio
        configDelivery.habilitado = (configLojaDados.delivery_status === true); 
        configDelivery.taxa = parseFloat(configLojaDados.delivery_fee) || 0;
        
        chavePixLoja = configLojaDados.chave_pix || ""; document.getElementById('chave-pix-texto').innerText = chavePixLoja;
        const optDelivery = document.getElementById('opt-delivery'); const deliveryInfoText = document.getElementById('store-delivery-info');
        
        if (configDelivery.habilitado) { optDelivery.style.display = 'block'; let tempoStr = configLojaDados.delivery_time ? configLojaDados.delivery_time : "Disponível"; deliveryInfoText.innerHTML = `${tempoStr} <span style="font-size:10px; display:block; color:var(--primary-green)">A partir do bairro</span>`; } 
        else { optDelivery.style.display = 'none'; document.getElementById('tipo-entrega').value = 'Retirada'; verificarRegrasCheckout(); deliveryInfoText.innerText = "Indisponível"; }
        
        if(configLojaDados.nome_loja) document.getElementById('store-brand-title').innerText = configLojaDados.nome_loja; if(configLojaDados.frase_efeito) document.getElementById('store-quote').innerText = `"${configLojaDados.frase_efeito}"`; if(configLojaDados.endereco) document.getElementById('store-address').innerText = configLojaDados.endereco;
        
        const linkZap = document.getElementById('link-whatsapp');
        if(configLojaDados.telefone && configLojaDados.telefone.trim() !== '') { lojaTelefone = configLojaDados.telefone.replace(/\D/g,''); linkZap.href = `https://wa.me/55${lojaTelefone}`; linkZap.style.display = 'flex'; } else { lojaTelefone = ''; linkZap.style.display = 'none'; }
        
        const linkInsta = document.getElementById('link-instagram'); if(configLojaDados.instagram && configLojaDados.instagram.trim() !== '') { linkInsta.href = configLojaDados.instagram; linkInsta.style.display = 'flex'; } else { linkInsta.style.display = 'none'; }
        const linkFace = document.getElementById('link-facebook'); if(configLojaDados.facebook && configLojaDados.facebook.trim() !== '') { linkFace.href = configLojaDados.facebook; linkFace.style.display = 'flex'; } else { linkFace.style.display = 'none'; }
        
        if(configLojaDados.hr_semana) document.getElementById('hours-weekday').innerText = configLojaDados.hr_semana; if(configLojaDados.hr_sabado) document.getElementById('hours-saturday').innerText = configLojaDados.hr_sabado; if(configLojaDados.hr_domingo) document.getElementById('hours-sunday').innerText = configLojaDados.hr_domingo;
        
        // Roda a checagem pela primeira vez
        checarHorarioAutomatizado();
    }
});

onSnapshot(collection(db, "taxas_entrega"), (snapshot) => {
    taxasDisponiveis = []; const selectBairro = document.getElementById('end-bairro'); selectBairro.innerHTML = '<option value="">Selecione seu Bairro / Região...</option>';
    snapshot.forEach(doc => { const taxa = { id: doc.id, ...doc.data() }; taxasDisponiveis.push(taxa); selectBairro.innerHTML += `<option value="${taxa.id}">${taxa.bairro} (+ ${formatarMoeda(taxa.valor)})</option>`; });
});
onSnapshot(collection(db, "promocoes"), (snapshot) => { promocoesDisponiveis = []; snapshot.forEach(doc => promocoesDisponiveis.push({ id: doc.id, ...doc.data() })); });

const alertaModal = document.getElementById('custom-alert'); const alertaMensagem = document.getElementById('custom-alert-message'); const alertaBtn = document.getElementById('custom-alert-btn');
function mostrarAlerta(mensagem) { alertaMensagem.innerText = mensagem; alertaModal.classList.add('active'); }
alertaBtn.addEventListener('click', () => alertaModal.classList.remove('active'));

let categoriasDb = []; let produtosDb = []; let cardapioOficial = []; 
const menuContainer = document.getElementById('menu-container'); const navCategorias = document.getElementById('nav-categorias');

onSnapshot(collection(db, "categorias"), (snapshot) => { categoriasDb = []; snapshot.forEach(doc => categoriasDb.push({ id: doc.id, ...doc.data() })); montarCardapio(); });
onSnapshot(collection(db, "produtos"), (snapshot) => { produtosDb = []; snapshot.forEach(doc => produtosDb.push({ id: doc.id, ...doc.data() })); montarCardapio(); });

function montarCardapio() {
    if (categoriasDb.length === 0 && produtosDb.length === 0) return;
    cardapioOficial = categoriasDb.map(cat => { return { id_categoria: cat.id, categoria: cat.nome, descricao: cat.descricao || "", produtos: produtosDb.filter(p => p.categoria_id === cat.id) }; }).filter(cat => cat.produtos.length > 0); 
    renderizarCardapio(cardapioOficial); renderizarNavegacao(cardapioOficial);
}
function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function renderizarNavegacao(dados) { navCategorias.innerHTML = ''; dados.forEach((secao, index) => { const activeClass = index === 0 ? 'active' : ''; navCategorias.innerHTML += `<button class="nav-item ${activeClass}" onclick="scrollToCategory('${secao.id_categoria}', this)">${secao.categoria}</button>`; }); }

function renderizarCardapio(dados) {
    menuContainer.innerHTML = ''; 
    if (dados.length === 0) { menuContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">Nenhum produto encontrado.</p>'; return; }
    dados.forEach(secao => {
        let htmlSecao = `<section class="category-section" id="${secao.id_categoria}"><div class="category-header"><h2>${secao.categoria}</h2><p>${secao.descricao}</p></div>`;
        secao.produtos.forEach(produto => {
            let tagsHtml = ''; if (produto.tags && Array.isArray(produto.tags)) tagsHtml = produto.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            htmlSecao += `<div class="product-card"><img src="${produto.imagem}" alt="${produto.nome}" class="product-image"><div class="product-details"><h3 class="product-name">${produto.nome}</h3><p class="product-desc">${produto.desc}</p><div class="product-tags">${tagsHtml}</div><div class="product-action"><span class="product-price">${formatarMoeda(produto.preco)} <span class="price-suffix">a partir de</span></span><button class="btn-add" onclick="abrirModal('${produto.id}')">${produto.btnTexto || 'Adicionar'}</button></div></div></div>`;
        });
        htmlSecao += `</section>`; menuContainer.innerHTML += htmlSecao;
    });
}

const inputBusca = document.getElementById('search-input');
inputBusca.addEventListener('input', (evento) => {
    const termo = evento.target.value.toLowerCase();
    if (termo === '') return renderizarCardapio(cardapioOficial);
    const cardapioFiltrado = cardapioOficial.map(secao => { const produtosFiltrados = secao.produtos.filter(p => p.nome.toLowerCase().includes(termo) || p.desc.toLowerCase().includes(termo)); return { ...secao, produtos: produtosFiltrados }; }).filter(secao => secao.produtos.length > 0); 
    renderizarCardapio(cardapioFiltrado);
});

const avalCarousel = document.getElementById('reviews-carousel'); const storeRating = document.getElementById('store-rating'); 
onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
    let htmlAvals = ''; let temAvaliacao = false; let somaNotas = 0; let totalAprovadas = 0; 
    snapshot.forEach(docSnap => {
        const aval = docSnap.data();
        if (aval.status === 'aprovado') {
            temAvaliacao = true; somaNotas += aval.nota; totalAprovadas++; 
            let estrelasHtml = '⭐'.repeat(aval.nota); let imgHtml = aval.imagem ? `<img src="${aval.imagem}" class="review-img">` : '';
            htmlAvals += `<div class="review-card"><div class="review-top"><span class="review-name"><i class="fa-solid fa-user-circle" style="color:var(--primary-green); margin-right:5px;"></i>${aval.nome}</span><span class="review-stars">${estrelasHtml}</span></div><p class="review-text">"${aval.comentario}"</p>${imgHtml}</div>`;
        }
    });
    if (totalAprovadas > 0) { const media = (somaNotas / totalAprovadas).toFixed(1); storeRating.innerHTML = `<i class="fa-solid fa-star" style="color: var(--accent-gold);"></i> ${media} (${totalAprovadas} Avaliações)`; storeRating.style.display = 'block'; } 
    else { storeRating.style.display = 'none'; }
    if (temAvaliacao) avalCarousel.innerHTML = htmlAvals; else avalCarousel.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); padding: 0 20px;">Seja o primeiro a deixar uma foto e avaliação do seu pedido!</p>';
});

const modalAvaliacao = document.getElementById('avaliacao-modal'); const fileInputAval = document.getElementById('aval-img-file'); const previewImgAval = document.getElementById('aval-img-preview');
window.abrirModalAvaliacao = function() { document.getElementById('aval-nome').value = ''; document.getElementById('aval-texto').value = ''; document.getElementById('aval-img-base64').value = ''; fileInputAval.value = ''; previewImgAval.style.display = 'none'; document.body.style.overflow = 'hidden'; modalAvaliacao.classList.add('active'); }
window.fecharModalAvaliacao = function() { modalAvaliacao.classList.remove('active'); document.body.style.overflow = ''; }
fileInputAval.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image(); img.onload = function() {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 500; const MAX_HEIGHT = 500; let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                previewImgAval.src = base64String; previewImgAval.style.display = 'block'; document.getElementById('aval-img-base64').value = base64String;
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});
window.enviarAvaliacao = async function() {
    const nome = document.getElementById('aval-nome').value; const nota = parseInt(document.getElementById('aval-nota').value); const texto = document.getElementById('aval-texto').value; const imagem = document.getElementById('aval-img-base64').value;
    if(!nome || !texto) return mostrarAlerta("Por favor, preencha seu nome e um comentário.");
    const btnEnviar = document.getElementById('btn-enviar-avaliacao'); const txtOriginal = btnEnviar.innerText; btnEnviar.innerText = "Enviando..."; btnEnviar.disabled = true;
    try { await addDoc(collection(db, "avaliacoes"), { nome: nome, nota: nota, comentario: texto, imagem: imagem, data_hora: new Date().toISOString(), status: "pendente" }); fecharModalAvaliacao(); mostrarAlerta("Muito obrigado! Sua avaliação foi enviada e em breve aparecerá no nosso mural. ❤️"); } catch (e) { mostrarAlerta("Erro ao enviar avaliação. Tente novamente."); } finally { btnEnviar.innerText = txtOriginal; btnEnviar.disabled = false; }
}

let carrinho = []; let produtoAtual = null; let quantidadeAtual = 1;
const modalProduto = document.getElementById('product-modal'); const btnCloseModalProduto = document.getElementById('close-modal'); const textoQuantidade = document.querySelector('.qty-number'); const textoTotalModal = document.getElementById('modal-total'); const campoObservacao = document.querySelector('.modal-options textarea');

window.abrirModal = function(idProduto) {
    if (!lojaAberta) return mostrarAlerta("Nossa loja está fechada no momento. Volte mais tarde!"); // Impede adicionar itens se fechado
    
    const produto = produtosDb.find(p => p.id === idProduto); if (!produto) return;
    produtoAtual = { ...produto }; quantidadeAtual = 1; document.getElementById('modal-title').innerText = produto.nome; document.getElementById('modal-desc').innerText = produto.desc; document.getElementById('modal-price').innerText = formatarMoeda(produto.preco);
    const imgModal = document.getElementById('modal-img'); if(produto.imagem && produto.imagem !== '') { imgModal.src = produto.imagem; } else { imgModal.src = 'assets/img/icon.png'; }
    const opcoesContainer = document.getElementById('modal-opcoes-container'); const opcoesList = document.getElementById('modal-opcoes-list'); opcoesList.innerHTML = ''; 
    if (produto.opcoes && produto.opcoes.length > 0) {
        opcoesContainer.style.display = 'block'; produto.opcoes.forEach(opcao => { opcoesList.innerHTML += `<label class="opcao-radio"><input type="radio" name="prod_opcao" value="${opcao}"> ${opcao}</label>`; });
    } else { opcoesContainer.style.display = 'none'; }
    atualizarTotalModal(); document.body.style.overflow = 'hidden'; modalProduto.classList.add('active');
}

function atualizarTotalModal() { textoQuantidade.innerText = quantidadeAtual; textoTotalModal.innerText = formatarMoeda(produtoAtual.preco * quantidadeAtual); }
document.querySelector('.btn-qty:first-child').addEventListener('click', () => { if (quantidadeAtual > 1) { quantidadeAtual--; atualizarTotalModal(); } });
document.querySelector('.btn-qty:last-child').addEventListener('click', () => { quantidadeAtual++; atualizarTotalModal(); });
function fecharModalProduto() { modalProduto.classList.remove('active'); campoObservacao.value = ''; document.body.style.overflow = ''; }
btnCloseModalProduto.addEventListener('click', fecharModalProduto); modalProduto.addEventListener('click', (e) => { if (e.target === modalProduto) fecharModalProduto(); });

document.querySelector('.btn-add-to-cart').addEventListener('click', () => {
    let opcaoSelecionada = null;
    if (produtoAtual.opcoes && produtoAtual.opcoes.length > 0) {
        const radios = document.getElementsByName('prod_opcao'); for (const radio of radios) { if (radio.checked) { opcaoSelecionada = radio.value; break; } }
        if (!opcaoSelecionada) return mostrarAlerta("Por favor, escolha uma opção obrigatória antes de adicionar ao pedido.");
    }
    let nomeFinal = produtoAtual.nome; if (opcaoSelecionada) nomeFinal += ` (${opcaoSelecionada})`;
    carrinho.push({ ...produtoAtual, nome: nomeFinal, quantidade: quantidadeAtual, observacao: campoObservacao.value, total: produtoAtual.preco * quantidadeAtual });
    atualizarBarraCarrinho(); fecharModalProduto(); mostrarAlerta(`${quantidadeAtual}x ${nomeFinal} adicionado ao pedido!`);
});

function atualizarBarraCarrinho() {
    const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0); const valorTotal = carrinho.reduce((soma, item) => soma + item.total, 0);
    document.querySelector('.cart-items-count').innerText = totalItens === 1 ? '1 item' : `${totalItens} itens`; document.querySelector('.cart-total').innerText = formatarMoeda(valorTotal); 
    
    // Mantém a cor visual do carrinho de acordo com status aberto/fechado
    const btnCart = document.querySelector('.btn-view-cart');
    if (!lojaAberta) {
        btnCart.style.backgroundColor = '#ccc'; btnCart.innerText = 'Loja Fechada';
    } else {
        btnCart.style.backgroundColor = totalItens > 0 ? 'var(--primary-green)' : 'var(--text-dark)';
        btnCart.innerText = 'Ver pedido';
    }
}

window.scrollToCategory = function(idCategoria, elementoBotao) {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active')); if(elementoBotao) elementoBotao.classList.add('active');
    const elementoAlvo = document.getElementById(idCategoria); if (elementoAlvo) { const yOffset = -70; const y = elementoAlvo.getBoundingClientRect().top + window.pageYOffset + yOffset; window.scrollTo({top: y, behavior: 'smooth'}); }
}

const cartModal = document.getElementById('cart-modal'); const btnCloseCart = document.getElementById('close-cart-modal'); const cartItemsContainer = document.getElementById('cart-items-container'); const checkoutTotal = document.getElementById('checkout-total');

window.aplicarCupom = function() {
    const input = document.getElementById('input-cupom').value.toUpperCase().trim(); const msg = document.getElementById('msg-cupom');
    if(!input) { msg.innerText = "Digite um código!"; msg.style.color = "#D62828"; msg.style.display = "block"; return; }
    const cupom = promocoesDisponiveis.find(p => p.codigo === input);
    if (!cupom) { msg.innerText = "Cupom inválido ou não existe!"; msg.style.color = "#D62828"; msg.style.display = "block"; cupomAtivo = null; renderizarItensCarrinho(); return; }
    if (!cupom.ativo) { msg.innerText = "Este cupom está inativo!"; msg.style.color = "#D62828"; msg.style.display = "block"; cupomAtivo = null; renderizarItensCarrinho(); return; }
    cupomAtivo = cupom; msg.innerText = "Cupom aplicado com sucesso!"; msg.style.color = "var(--color-ready)"; msg.style.display = "block"; renderizarItensCarrinho();
}

window.verificarRegrasCheckout = function() {
    const tipo = document.getElementById('tipo-entrega').value; const boxEnd = document.getElementById('box-endereco'); const lblTaxa = document.getElementById('label-taxa'); const pgto = document.getElementById('forma-pagamento').value; const boxPix = document.getElementById('box-pix-antecipado'); const optPix = document.getElementById('opt-pgto-pix'); const boxMesa = document.getElementById('box-mesa');
    if (tipo === 'Delivery') { boxEnd.style.display = 'block'; boxMesa.style.display = 'none'; lblTaxa.style.display = 'inline'; optPix.innerText = "Pix (Pagar agora)"; } else if (tipo === 'Mesa') { boxEnd.style.display = 'none'; boxMesa.style.display = 'block'; lblTaxa.style.display = 'none'; optPix.innerText = "Pix (Pagar na mesa)"; } else { boxEnd.style.display = 'none'; boxMesa.style.display = 'none'; lblTaxa.style.display = 'none'; optPix.innerText = "Pix (Na retirada)"; }
    if (tipo === 'Delivery' && pgto === 'pix') { boxPix.style.display = 'block'; } else { boxPix.style.display = 'none'; }
    if (carrinho.length > 0) renderizarItensCarrinho();
}
window.toggleEndereco = window.verificarRegrasCheckout; 
window.copiarPix = function() { navigator.clipboard.writeText(chavePixLoja).then(() => { mostrarAlerta("Chave PIX copiada para a área de transferência!"); }); }

document.querySelector('.btn-view-cart').addEventListener('click', () => {
    if (!lojaAberta) return mostrarAlerta("Nossa loja está fechada no momento. Volte mais tarde!");
    if (carrinho.length === 0) return mostrarAlerta("Seu carrinho está vazio!");
    verificarRegrasCheckout(); renderizarItensCarrinho(); document.body.style.overflow = 'hidden'; cartModal.classList.add('active');
});

btnCloseCart.addEventListener('click', () => { cartModal.classList.remove('active'); document.body.style.overflow = ''; });

window.renderizarItensCarrinho = function() {
    cartItemsContainer.innerHTML = ''; let valorTotalItens = 0;
    carrinho.forEach((item, index) => {
        valorTotalItens += item.total; let obsHtml = item.observacao ? `<p>Obs: ${item.observacao}</p>` : '';
        cartItemsContainer.innerHTML += `<div class="cart-item-row"><div class="cart-item-info"><h4>${item.quantidade}x ${item.nome}</h4>${obsHtml}<button class="btn-remove-item" onclick="removerDoCarrinho(${index})">Remover</button></div><div class="cart-item-price">${formatarMoeda(item.total)}</div></div>`;
    });
    document.getElementById('checkout-subtotal').innerText = formatarMoeda(valorTotalItens);
    let descontoCalc = 0;
    if (cupomAtivo) {
        if(cupomAtivo.tipo === 'porcentagem') descontoCalc = valorTotalItens * (cupomAtivo.valor / 100); else descontoCalc = cupomAtivo.valor;
        if(descontoCalc > valorTotalItens) descontoCalc = valorTotalItens; 
        document.getElementById('label-desconto').style.display = 'inline'; document.getElementById('checkout-desconto').innerText = `- ${formatarMoeda(descontoCalc)}`;
    } else { document.getElementById('label-desconto').style.display = 'none'; }

    const tipo = document.getElementById('tipo-entrega').value; let taxa = 0;
    if (tipo === 'Delivery') {
        const idBairro = document.getElementById('end-bairro').value; const bairroObj = taxasDisponiveis.find(t => t.id === idBairro); if(bairroObj) taxa = bairroObj.valor;
    }
    document.getElementById('checkout-taxa').innerText = formatarMoeda(taxa);
    const totalFinal = (valorTotalItens - descontoCalc) + taxa; checkoutTotal.innerText = formatarMoeda(totalFinal);
}

window.removerDoCarrinho = function(index) { carrinho.splice(index, 1); atualizarBarraCarrinho(); if (carrinho.length === 0) { cartModal.classList.remove('active'); document.body.style.overflow = ''; } else { renderizarItensCarrinho(); } }

window.fecharLimparTudo = function() {
    carrinho = []; cupomAtivo = null; document.getElementById('msg-cupom').style.display = 'none'; document.getElementById('input-cupom').value = ''; atualizarBarraCarrinho(); document.getElementById('whatsapp-modal').classList.remove('active'); document.body.style.overflow = '';
    document.getElementById('cliente-nome').value = ''; document.getElementById('end-bairro').value = ''; document.getElementById('end-rua').value = ''; document.getElementById('end-numero').value = ''; document.getElementById('end-comp').value = ''; document.getElementById('num-mesa').value = '';
}

document.getElementById('btn-finalizar-pedido').addEventListener('click', async () => {
    if (!lojaAberta) return mostrarAlerta("Nossa loja está fechada no momento. Volte mais tarde!");
    const nome = document.getElementById('cliente-nome').value; const selectPgto = document.getElementById('forma-pagamento'); const pagamentoId = selectPgto.value; const pagamentoTexto = selectPgto.options[selectPgto.selectedIndex].text; const tipoEntrega = document.getElementById('tipo-entrega').value;

    if (nome.trim() === '') return mostrarAlerta("Por favor, digite seu nome."); if (pagamentoId === '') return mostrarAlerta("Por favor, selecione a forma de pagamento.");

    let enderecoFinal = ""; let taxaCobrada = 0; let bairroNome = "";
    if (tipoEntrega === 'Delivery') {
        const idBairro = document.getElementById('end-bairro').value; const rua = document.getElementById('end-rua').value; const numero = document.getElementById('end-numero').value; const comp = document.getElementById('end-comp').value;
        if (!idBairro) return mostrarAlerta("Por favor, selecione o Bairro de entrega."); if (!rua || !numero) return mostrarAlerta("Por favor, preencha Rua e Número.");
        const bairroObj = taxasDisponiveis.find(t => t.id === idBairro); bairroNome = bairroObj.bairro; enderecoFinal = `${rua}, ${numero} - ${bairroNome}`; if(comp) enderecoFinal += ` (${comp})`; taxaCobrada = bairroObj.valor;
    } else if (tipoEntrega === 'Mesa') {
        const numMesa = document.getElementById('num-mesa').value; if (!numMesa) return mostrarAlerta("Por favor, informe o número da sua mesa."); enderecoFinal = `Mesa ${numMesa}`; taxaCobrada = 0;
    }

    const valorTotalItens = carrinho.reduce((soma, item) => soma + item.total, 0); let descontoCobrado = 0; let cupomNome = '';
    if (cupomAtivo) { if(cupomAtivo.tipo === 'porcentagem') descontoCobrado = valorTotalItens * (cupomAtivo.valor / 100); else descontoCobrado = cupomAtivo.valor; if(descontoCobrado > valorTotalItens) descontoCobrado = valorTotalItens; cupomNome = cupomAtivo.codigo; }
    const totalFinalCalculado = (valorTotalItens - descontoCobrado) + taxaCobrada;

    const pedidoFinal = { 
        cliente: nome, pagamento: pagamentoTexto, tipo_entrega: tipoEntrega, endereco_entrega: enderecoFinal, taxa_entrega: taxaCobrada, cupom_aplicado: cupomNome, valor_desconto: descontoCobrado, itens: carrinho, total_pedido: totalFinalCalculado, data_hora: new Date().toISOString(), status: "novo", pago: false 
    };

    const btnFinalizar = document.getElementById('btn-finalizar-pedido'); const textoOriginal = btnFinalizar.innerText; btnFinalizar.innerText = "Processando..."; btnFinalizar.disabled = true;

    try {
        const docRef = await addDoc(collection(db, "pedidos"), pedidoFinal); localStorage.setItem('meuPedidoNutriLife', docRef.id); escutarStatusPedido(docRef.id);

        let textoWhats = `*NOVO PEDIDO!* 🍔\n*Cliente:* ${nome}\n*Entrega:* ${tipoEntrega}\n`;
        if (tipoEntrega === 'Delivery' || tipoEntrega === 'Mesa') textoWhats += `*Local:* ${enderecoFinal}\n`;
        textoWhats += `\n*RESUMO:*\n`;
        carrinho.forEach(item => { textoWhats += `${item.quantidade}x ${item.nome} - ${formatarMoeda(item.total)}\n`; if(item.observacao) textoWhats += `   _Obs: ${item.observacao}_\n`; });
        textoWhats += `\n*Subtotal:* ${formatarMoeda(valorTotalItens)}\n`;
        if(descontoCobrado > 0) textoWhats += `*Desconto:* - ${formatarMoeda(descontoCobrado)} (${cupomNome})\n`;
        if(taxaCobrada > 0) textoWhats += `*Taxa:* ${formatarMoeda(taxaCobrada)}\n`;
        textoWhats += `*Total:* ${formatarMoeda(totalFinalCalculado)}\n\n*Pagamento:* ${pagamentoTexto}`;

        if (tipoEntrega === 'Delivery' && pagamentoId === 'pix') {
            textoWhats += `\n\n📌 _Segue o comprovante do PIX:_`; document.getElementById('whatsapp-instrucao').innerText = "Seu pedido já está na nossa cozinha! Clique abaixo e nos envie a confirmação junto com o comprovante do PIX.";
        } else { document.getElementById('whatsapp-instrucao').innerText = "Seu pedido já está na nossa cozinha! Para agilizar o atendimento, clique abaixo e nos envie a confirmação no WhatsApp."; }

        const encodedText = encodeURIComponent(textoWhats); const waLink = `https://wa.me/55${lojaTelefone}?text=${encodedText}`;
        document.getElementById('btn-enviar-whatsapp').onclick = () => { window.open(waLink, '_blank'); fecharLimparTudo(); };

        cartModal.classList.remove('active'); document.getElementById('whatsapp-modal').classList.add('active');
    } catch (erro) { mostrarAlerta("Ocorreu um erro ao enviar. Tente novamente."); } finally { btnFinalizar.innerText = textoOriginal; btnFinalizar.disabled = false; }
});

const urlParams = new URLSearchParams(window.location.search); const mesaParam = urlParams.get('mesa');
if(mesaParam) { setTimeout(() => { const selectEntrega = document.getElementById('tipo-entrega'); const inputMesa = document.getElementById('num-mesa'); selectEntrega.value = 'Mesa'; inputMesa.value = mesaParam; selectEntrega.disabled = true; inputMesa.disabled = true; verificarRegrasCheckout(); }, 1000); }
