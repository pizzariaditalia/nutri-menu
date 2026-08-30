import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

let viewAtual = 'pedidos'; 
const badgePedidos = document.getElementById('badge-pedidos');
const badgeAvaliacoes = document.getElementById('badge-avaliacoes'); 

function esconderTodasViews() {
    document.getElementById('view-pedidos').style.display = 'none';
    document.getElementById('view-cardapio').style.display = 'none';
    document.getElementById('view-taxas').style.display = 'none';
    document.getElementById('view-promocoes').style.display = 'none';
    document.getElementById('view-avaliacoes').style.display = 'none'; 
    document.getElementById('view-relatorios').style.display = 'none';
    document.getElementById('view-config').style.display = 'none';
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => btn.classList.remove('active'));
}

document.getElementById('menu-pedidos').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'pedidos'; esconderTodasViews(); document.getElementById('view-pedidos').style.display = 'flex'; document.getElementById('menu-pedidos').classList.add('active'); document.getElementById('header-title').innerText = "Gestão de Pedidos"; badgePedidos.style.display = 'none'; });
document.getElementById('menu-cardapio').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'cardapio'; esconderTodasViews(); document.getElementById('view-cardapio').style.display = 'flex'; document.getElementById('menu-cardapio').classList.add('active'); document.getElementById('header-title').innerText = "Gerenciar Cardápio"; });
document.getElementById('menu-taxas').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'taxas'; esconderTodasViews(); document.getElementById('view-taxas').style.display = 'flex'; document.getElementById('menu-taxas').classList.add('active'); document.getElementById('header-title').innerText = "Taxas de Entrega"; });
document.getElementById('menu-promocoes').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'promocoes'; esconderTodasViews(); document.getElementById('view-promocoes').style.display = 'flex'; document.getElementById('menu-promocoes').classList.add('active'); document.getElementById('header-title').innerText = "Cupons e Promoções"; });
document.getElementById('menu-avaliacoes').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'avaliacoes'; esconderTodasViews(); document.getElementById('view-avaliacoes').style.display = 'flex'; document.getElementById('menu-avaliacoes').classList.add('active'); document.getElementById('header-title').innerText = "Moderação de Avaliações"; badgeAvaliacoes.style.display = 'none'; });
document.getElementById('menu-relatorios').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'relatorios'; esconderTodasViews(); document.getElementById('view-relatorios').style.display = 'flex'; document.getElementById('menu-relatorios').classList.add('active'); document.getElementById('header-title').innerText = "Relatórios e Vendas"; });
document.getElementById('menu-config').addEventListener('click', (e) => { e.preventDefault(); viewAtual = 'config'; esconderTodasViews(); document.getElementById('view-config').style.display = 'flex'; document.getElementById('menu-config').classList.add('active'); document.getElementById('header-title').innerText = "Configurações da Loja"; });

document.getElementById('btn-logout').addEventListener('click', (e) => { e.preventDefault(); sessionStorage.removeItem('adminLogado'); window.location.href = 'login.html'; });

function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataHora(dataString) { const data = new Date(dataString); return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function tocarSomNotificacao() { const audio = new Audio('assets/audio/notificacao.mp3'); audio.onerror = () => { audio.src = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'; audio.play().catch(e=>e); }; audio.play().catch(e=>e); }

let primeiraCarga = true; let vendasConcluidas = []; let paginaAtualVendas = 1; const itensPorPagina = 10;
onSnapshot(collection(db, "pedidos"), (snapshot) => {
    snapshot.docChanges().forEach((change) => { if (change.type === "added" && !primeiraCarga) { if (change.doc.data().status === 'novo') { tocarSomNotificacao(); if (viewAtual !== 'pedidos') badgePedidos.style.display = 'flex'; } } });
    primeiraCarga = false; 
    document.getElementById('lista-novos').innerHTML = ''; document.getElementById('lista-preparo').innerHTML = ''; document.getElementById('lista-pronto').innerHTML = '';
    let qtdNovos = 0, qtdPreparo = 0, qtdPronto = 0; let faturamentoTotal = 0, totalVendas = 0; let contagemProdutos = {}; vendasConcluidas = []; 

    snapshot.forEach((documento) => {
        const pedido = documento.data(); const idPedido = documento.id; 
        if (pedido.status === 'pronto' || pedido.status === 'arquivado') { faturamentoTotal += pedido.total_pedido; totalVendas++; vendasConcluidas.push(pedido); pedido.itens.forEach(item => { contagemProdutos[item.nome] = (contagemProdutos[item.nome] || 0) + item.quantidade; }); }
        if (pedido.status === 'arquivado') return;
        let itensHtml = ''; pedido.itens.forEach(item => { let obsHtml = item.observacao ? `<span class="obs">Obs: ${item.observacao}</span>` : ''; itensHtml += `<li>${item.quantidade}x ${item.nome} ${obsHtml}</li>`; });
        let btnAcao = '';
        if (pedido.status === 'novo') { btnAcao = `<button class="btn-action btn-start" onclick="atualizarStatus('${idPedido}', 'preparo')">Começar Preparo</button>`; qtdNovos++; }
        else if (pedido.status === 'preparo') { btnAcao = `<button class="btn-action btn-finish" onclick="atualizarStatus('${idPedido}', 'pronto')">Marcar como Pronto</button>`; qtdPreparo++; }
        else if (pedido.status === 'pronto') { btnAcao = `<button class="btn-action btn-archive" onclick="atualizarStatus('${idPedido}', 'arquivado')"><i class="fa-solid fa-check"></i> Entregue (Arquivar)</button>`; qtdPronto++; }
        let deliveryBadge = pedido.tipo_entrega === 'Delivery' ? `<span style="background:#E9C46A; color:#333; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;"><i class="fa-solid fa-motorcycle"></i> Delivery</span>` : `<span style="background:#E5E4DE; color:#333; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;"><i class="fa-solid fa-person-walking"></i> Retirada</span>`;
        let enderecoHtml = ''; if (pedido.tipo_entrega === 'Delivery' && pedido.endereco_entrega) { enderecoHtml = `<div style="font-size:12px; margin-bottom:10px; background:#FFF5F5; padding:8px; border-radius:6px; border:1px solid #E26D5C;"><strong><i class="fa-solid fa-location-dot" style="color:var(--color-new)"></i> Endereço:</strong> ${pedido.endereco_entrega}</div>`; }
        const cartaoHtml = `<div class="order-card ${pedido.status}"><div class="order-header"><span class="order-client"><i class="fa-solid fa-user" style="color: var(--primary-green); margin-right: 5px;"></i> ${pedido.cliente} ${deliveryBadge}</span><span class="order-time"><i class="fa-regular fa-clock" style="margin-right: 5px;"></i> ${formatarDataHora(pedido.data_hora).split(' às ')[1]}</span></div>${enderecoHtml}<ul class="order-items">${itensHtml}</ul><div class="order-footer"><span class="order-total">${formatarMoeda(pedido.total_pedido)}</span><span class="order-payment"><i class="fa-regular fa-credit-card" style="margin-right: 4px;"></i> ${pedido.pagamento}</span></div>${btnAcao}</div>`;
        if (pedido.status === 'novo') document.getElementById('lista-novos').innerHTML += cartaoHtml;
        if (pedido.status === 'preparo') document.getElementById('lista-preparo').innerHTML += cartaoHtml;
        if (pedido.status === 'pronto') document.getElementById('lista-pronto').innerHTML += cartaoHtml;
    });

    document.getElementById('count-novos').innerText = qtdNovos; document.getElementById('count-preparo').innerText = qtdPreparo; document.getElementById('count-pronto').innerText = qtdPronto;
    const tabNovos = document.getElementById('tab-count-novos');
    if(tabNovos) { tabNovos.innerText = qtdNovos; if(qtdNovos > 0) { tabNovos.classList.add('alert-red'); } else { tabNovos.classList.remove('alert-red'); } }
    const tabPreparo = document.getElementById('tab-count-preparo'); if(tabPreparo) tabPreparo.innerText = qtdPreparo;
    const tabPronto = document.getElementById('tab-count-pronto'); if(tabPronto) tabPronto.innerText = qtdPronto;

    const ticketMedio = totalVendas > 0 ? (faturamentoTotal / totalVendas) : 0; let topProduto = "-", maxVendas = 0;
    for (const [nome, qtd] of Object.entries(contagemProdutos)) { if (qtd > maxVendas) { maxVendas = qtd; topProduto = nome; } }
    document.getElementById('res-faturamento').innerText = formatarMoeda(faturamentoTotal); document.getElementById('res-vendas').innerText = totalVendas; document.getElementById('res-ticket').innerText = formatarMoeda(ticketMedio); document.getElementById('res-top-produto').innerText = topProduto;
    vendasConcluidas.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora)); renderizarPaginaVendas();
});

window.atualizarStatus = async function(idPedido, novoStatus) { try { await updateDoc(doc(db, "pedidos", idPedido), { status: novoStatus }); } catch (erro) { alert("Erro ao atualizar."); } }
window.mudarPaginaVendas = function(novaPagina) { paginaAtualVendas = novaPagina; renderizarPaginaVendas(); }
function renderizarPaginaVendas() {
    const lista = document.getElementById('lista-vendas-concluidas'); const controles = document.getElementById('pagination-controls');
    if (vendasConcluidas.length === 0) { lista.innerHTML = '<p style="color:var(--text-muted);">Nenhuma venda concluída ainda.</p>'; controles.innerHTML = ''; return; }
    const inicio = (paginaAtualVendas - 1) * itensPorPagina; const itensPagina = vendasConcluidas.slice(inicio, inicio + itensPorPagina); let htmlLista = '';
    itensPagina.forEach(pedido => {
        let iconDelivery = pedido.tipo_entrega === 'Delivery' ? '<i class="fa-solid fa-motorcycle"></i> Delivery' : '<i class="fa-solid fa-person-walking"></i> Retirada';
        htmlLista += `<div class="sale-item"><div class="sale-info"><strong><i class="fa-solid fa-user" style="color: var(--primary-green); margin-right: 5px;"></i> ${pedido.cliente}</strong><div class="sale-details"><span><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> ${formatarDataHora(pedido.data_hora)}</span><span>${iconDelivery} • <i class="fa-regular fa-credit-card" style="margin: 0 4px 0 4px;"></i> ${pedido.pagamento.toUpperCase()}</span></div></div><div class="sale-value">+ ${formatarMoeda(pedido.total_pedido)}</div></div>`;
    });
    lista.innerHTML = htmlLista;
    const totalPaginas = Math.ceil(vendasConcluidas.length / itensPorPagina); let htmlControles = '';
    if (totalPaginas > 1) { for (let i = 1; i <= totalPaginas; i++) { htmlControles += `<button class="page-btn ${i === paginaAtualVendas ? 'active' : ''}" onclick="mudarPaginaVendas(${i})">${i}</button>`; } }
    controles.innerHTML = htmlControles;
}

const tabBtns = document.querySelectorAll('.tab-btn'); const kanbanCols = document.querySelectorAll('.kanban-column');
tabBtns.forEach(btn => { btn.addEventListener('click', () => { tabBtns.forEach(b => b.classList.remove('active')); kanbanCols.forEach(c => c.classList.remove('active-mobile')); btn.classList.add('active'); document.getElementById(btn.getAttribute('data-target')).classList.add('active-mobile'); }); });

let avaliacoes = []; let primeiraCargaAval = true;
onSnapshot(collection(db, "avaliacoes"), (snapshot) => {
    avaliacoes = [];
    snapshot.docChanges().forEach((change) => { 
        if (change.type === "added" && !primeiraCargaAval) { 
            if (change.doc.data().status === 'pendente') { tocarSomNotificacao(); if (viewAtual !== 'avaliacoes') badgeAvaliacoes.style.display = 'flex'; } 
        } 
    });
    primeiraCargaAval = false;
    snapshot.forEach(doc => avaliacoes.push({ id: doc.id, ...doc.data() })); 
    avaliacoes.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
    renderizarAvaliacoes();
});

function renderizarAvaliacoes() {
    const listaPendentes = document.getElementById('lista-avaliacoes-pendentes'); const listaAprovadas = document.getElementById('lista-avaliacoes-aprovadas');
    listaPendentes.innerHTML = ''; listaAprovadas.innerHTML = ''; let qtdPendentes = 0, qtdAprovadas = 0;
    avaliacoes.forEach(aval => {
        let estrelas = '⭐'.repeat(aval.nota);
        let miniImg = aval.imagem ? `<img src="${aval.imagem}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; margin-right:15px; border:1px solid #ccc;">` : '';
        let htmlAval = `<div class="prod-item" style="align-items: flex-start; flex-direction: column;"><div style="display:flex; width: 100%;">${miniImg}<div style="flex:1;"><strong style="font-size:14px;">${aval.nome} <span style="font-size:10px; color:#D62828;">${estrelas}</span></strong><span style="font-size:11px; color:#999; display:block; margin-bottom:5px;">${formatarDataHora(aval.data_hora)}</span><p style="font-size:13px; color:var(--text-dark); font-style:italic;">"${aval.comentario}"</p></div></div><div style="width: 100%; display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; border-top: 1px dashed #eee; padding-top: 10px;">${aval.status === 'pendente' ? `<button onclick="aprovarAvaliacao('${aval.id}')" style="background:var(--primary-green); color:white; border:none; padding:5px 15px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">Aprovar</button>` : ''}<button onclick="excluirAvaliacao('${aval.id}')" style="background:#D62828; color:white; border:none; padding:5px 15px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">Excluir</button></div></div>`;
        if (aval.status === 'pendente') { listaPendentes.innerHTML += htmlAval; qtdPendentes++; }
        if (aval.status === 'aprovado') { listaAprovadas.innerHTML += htmlAval; qtdAprovadas++; }
    });
    if(qtdPendentes === 0) listaPendentes.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">Nenhuma avaliação pendente.</p>';
    if(qtdAprovadas === 0) listaAprovadas.innerHTML = '<p style="font-size: 13px; color: var(--text-muted);">Nenhuma avaliação aprovada.</p>';
}
window.aprovarAvaliacao = async function(id) { if(confirm("Aprovar e exibir no site?")) { await updateDoc(doc(db, "avaliacoes", id), { status: "aprovado" }); } }
window.excluirAvaliacao = async function(id) { if(confirm("Apagar definitivamente essa avaliação?")) { await deleteDoc(doc(db, "avaliacoes", id)); } }

let categorias = []; let produtos = [];
onSnapshot(collection(db, "categorias"), (snapshot) => { categorias = []; snapshot.forEach(doc => categorias.push({ id: doc.id, ...doc.data() })); renderizarCardapioAdmin(); });
onSnapshot(collection(db, "produtos"), (snapshot) => { produtos = []; snapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() })); renderizarCardapioAdmin(); });
function renderizarCardapioAdmin() {
    const lista = document.getElementById('lista-cardapio-admin'); lista.innerHTML = '';
    if (categorias.length === 0) { lista.innerHTML = '<p style="color: var(--text-muted); margin-top: 20px;">Você ainda não tem categorias cadastradas.</p>'; return; }
    const selectCat = document.getElementById('prod-categoria'); selectCat.innerHTML = '';
    categorias.forEach(cat => {
        selectCat.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
        const prodsDaCategoria = produtos.filter(p => p.categoria_id === cat.id); let htmlProdutos = '';
        prodsDaCategoria.forEach(prod => {
            let miniImg = prod.imagem ? `<img src="${prod.imagem}" style="width:30px; height:30px; border-radius:4px; object-fit:cover; margin-right:10px;">` : '';
            htmlProdutos += `<div class="prod-item"><div class="prod-item-info" style="display:flex; align-items:center;">${miniImg}<div><strong>${prod.nome}</strong><span>${formatarMoeda(prod.preco)}</span></div></div><div class="prod-item-actions"><button class="edit" onclick="abrirModalProduto('${prod.id}')">Editar</button><button class="delete" onclick="excluirProduto('${prod.id}')">Excluir</button></div></div>`;
        });
        if(prodsDaCategoria.length === 0) htmlProdutos = '<p style="font-size:12px; color:var(--text-muted);">Nenhum produto cadastrado.</p>';
        lista.innerHTML += `<div class="cat-box"><div class="cat-header"><h3>${cat.nome}</h3><div class="action-buttons"><button class="edit" onclick="abrirModalCategoria('${cat.id}')">Editar</button><button class="delete" onclick="excluirCategoria('${cat.id}')">Excluir</button></div></div><div class="prod-list">${htmlProdutos}</div></div>`;
    });
}

const modalCat = document.getElementById('modal-categoria');
window.abrirModalCategoria = (id = '') => {
    if (id) { const cat = categorias.find(c => c.id === id); document.getElementById('cat-id').value = cat.id; document.getElementById('cat-nome').value = cat.nome; document.getElementById('cat-desc').value = cat.descricao || ''; document.getElementById('titulo-modal-categoria').innerText = 'Editar Categoria'; } 
    else { document.getElementById('cat-id').value = ''; document.getElementById('cat-nome').value = ''; document.getElementById('cat-desc').value = ''; document.getElementById('titulo-modal-categoria').innerText = 'Nova Categoria'; }
    modalCat.classList.add('active');
}
window.fecharModalCategoria = () => modalCat.classList.remove('active');
window.salvarCategoria = async () => {
    const id = document.getElementById('cat-id').value, nome = document.getElementById('cat-nome').value, desc = document.getElementById('cat-desc').value;
    if(!nome) return alert("Digite o nome da categoria!");
    if (id) await updateDoc(doc(db, "categorias", id), { nome: nome, descricao: desc }); else await addDoc(collection(db, "categorias"), { nome: nome, descricao: desc });
    fecharModalCategoria();
}
window.excluirCategoria = async (id) => { if(confirm("Excluir categoria?")) await deleteDoc(doc(db, "categorias", id)); }

const fileInput = document.getElementById('prod-img-file'); const previewImg = document.getElementById('prod-img-preview'); const placeholderTxt = document.getElementById('prod-img-placeholder');
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 500; const MAX_HEIGHT = 500; let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                previewImg.src = base64String; previewImg.style.display = 'block'; placeholderTxt.style.display = 'none'; document.getElementById('prod-img-url').value = base64String;
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

const modalProd = document.getElementById('modal-produto');
window.abrirModalProduto = (id = '') => {
    if(categorias.length === 0) return alert("Crie uma categoria primeiro!");
    fileInput.value = ''; 
    if (id) {
        const prod = produtos.find(p => p.id === id);
        document.getElementById('prod-id').value = prod.id; document.getElementById('prod-categoria').value = prod.categoria_id; document.getElementById('prod-nome').value = prod.nome; document.getElementById('prod-desc').value = prod.desc; document.getElementById('prod-preco').value = prod.preco; document.getElementById('prod-btn').value = prod.btnTexto || 'Adicionar'; document.getElementById('prod-tags').value = prod.tags ? prod.tags.join(', ') : ''; document.getElementById('prod-opcoes').value = prod.opcoes ? prod.opcoes.join(', ') : '';
        document.getElementById('prod-img-url').value = prod.imagem || '';
        if (prod.imagem && prod.imagem !== 'assets/img/icon.png') { previewImg.src = prod.imagem; previewImg.style.display = 'block'; placeholderTxt.style.display = 'none'; } else { previewImg.style.display = 'none'; placeholderTxt.style.display = 'block'; }
        document.getElementById('titulo-modal-produto').innerText = 'Editar Produto';
    } else {
        document.getElementById('prod-id').value = ''; document.getElementById('prod-nome').value = ''; document.getElementById('prod-desc').value = ''; document.getElementById('prod-preco').value = ''; document.getElementById('prod-btn').value = 'Adicionar'; document.getElementById('prod-tags').value = ''; document.getElementById('prod-opcoes').value = ''; document.getElementById('prod-img-url').value = '';
        previewImg.style.display = 'none'; placeholderTxt.style.display = 'block'; document.getElementById('titulo-modal-produto').innerText = 'Novo Produto';
    }
    modalProd.classList.add('active');
}
window.fecharModalProduto = () => modalProd.classList.remove('active');
window.salvarProduto = async () => {
    const id = document.getElementById('prod-id').value; const nomeProd = document.getElementById('prod-nome').value; const precoProd = parseFloat(document.getElementById('prod-preco').value);
    if(!nomeProd || isNaN(precoProd)) return alert("Nome e Preço são obrigatórios!");
    const btnSalvar = document.getElementById('btn-salvar-produto'); const txtOriginal = btnSalvar.innerText; btnSalvar.innerText = "Salvando..."; btnSalvar.disabled = true;
    let finalImageUrl = document.getElementById('prod-img-url').value || 'assets/img/icon.png';
    const dadosProduto = { categoria_id: document.getElementById('prod-categoria').value, nome: nomeProd, desc: document.getElementById('prod-desc').value, preco: precoProd, btnTexto: document.getElementById('prod-btn').value || 'Adicionar', tags: document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(t => t), opcoes: document.getElementById('prod-opcoes').value.split(',').map(o => o.trim()).filter(o => o), imagem: finalImageUrl };
    try { if (id) await updateDoc(doc(db, "produtos", id), dadosProduto); else await addDoc(collection(db, "produtos"), dadosProduto); fecharModalProduto(); } catch (e) { alert("Erro ao salvar produto."); } finally { btnSalvar.innerText = txtOriginal; btnSalvar.disabled = false; }
}
window.excluirProduto = async (id) => { if(confirm("Excluir produto?")) await deleteDoc(doc(db, "produtos", id)); }

let taxas = [];
onSnapshot(collection(db, "taxas_entrega"), (snapshot) => { taxas = []; snapshot.forEach(doc => taxas.push({ id: doc.id, ...doc.data() })); renderizarTaxasAdmin(); });
function renderizarTaxasAdmin() {
    const lista = document.getElementById('lista-taxas-admin'); lista.innerHTML = '';
    if (taxas.length === 0) { lista.innerHTML = '<p style="color: var(--text-muted);">Nenhuma região cadastrada.</p>'; return; }
    taxas.forEach(taxa => { lista.innerHTML += `<div class="prod-item"><div class="prod-item-info"><strong>📍 ${taxa.bairro}</strong><span>Taxa: ${formatarMoeda(taxa.valor)}</span></div><div class="prod-item-actions"><button class="edit" onclick="abrirModalTaxa('${taxa.id}')">Editar</button><button class="delete" onclick="excluirTaxa('${taxa.id}')">Excluir</button></div></div>`; });
}
const modalTaxa = document.getElementById('modal-taxa');
window.abrirModalTaxa = (id = '') => {
    if (id) { const taxa = taxas.find(t => t.id === id); document.getElementById('taxa-id').value = taxa.id; document.getElementById('taxa-nome').value = taxa.bairro; document.getElementById('taxa-valor').value = taxa.valor; document.getElementById('titulo-modal-taxa').innerText = 'Editar Região'; } 
    else { document.getElementById('taxa-id').value = ''; document.getElementById('taxa-nome').value = ''; document.getElementById('taxa-valor').value = ''; document.getElementById('titulo-modal-taxa').innerText = 'Nova Região / Taxa'; }
    modalTaxa.classList.add('active');
}
window.fecharModalTaxa = () => modalTaxa.classList.remove('active');
window.salvarTaxa = async () => { const id = document.getElementById('taxa-id').value; const nome = document.getElementById('taxa-nome').value; const valor = parseFloat(document.getElementById('taxa-valor').value); if(!nome || isNaN(valor)) return alert("Preencha Bairro e Valor corretamente!"); if (id) await updateDoc(doc(db, "taxas_entrega", id), { bairro: nome, valor: valor }); else await addDoc(collection(db, "taxas_entrega"), { bairro: nome, valor: valor }); fecharModalTaxa(); }
window.excluirTaxa = async (id) => { if(confirm("Excluir esta região?")) await deleteDoc(doc(db, "taxas_entrega", id)); }

let promocoes = [];
onSnapshot(collection(db, "promocoes"), (snapshot) => { promocoes = []; snapshot.forEach(doc => promocoes.push({ id: doc.id, ...doc.data() })); renderizarPromocoesAdmin(); });
function renderizarPromocoesAdmin() {
    const lista = document.getElementById('lista-promocoes-admin'); lista.innerHTML = '';
    if (promocoes.length === 0) { lista.innerHTML = '<p style="color: var(--text-muted);">Nenhum cupom cadastrado.</p>'; return; }
    promocoes.forEach(promo => { let textoDesconto = promo.tipo === 'porcentagem' ? `${promo.valor}% de desconto` : `- ${formatarMoeda(promo.valor)}`; let badge = promo.ativo ? '<span class="coupon-badge ativo">ATIVO</span>' : '<span class="coupon-badge inativo">INATIVO</span>'; lista.innerHTML += `<div class="prod-item"><div class="prod-item-info"><strong>🎟️ ${promo.codigo.toUpperCase()} ${badge}</strong><span>${textoDesconto}</span></div><div class="prod-item-actions"><button class="edit" onclick="abrirModalPromocao('${promo.id}')">Editar</button><button class="delete" onclick="excluirPromocao('${promo.id}')">Excluir</button></div></div>`; });
}
const modalPromo = document.getElementById('modal-promocao');
window.abrirModalPromocao = (id = '') => {
    if (id) { const promo = promocoes.find(p => p.id === id); document.getElementById('promo-id').value = promo.id; document.getElementById('promo-codigo').value = promo.codigo; document.getElementById('promo-tipo').value = promo.tipo; document.getElementById('promo-valor').value = promo.valor; document.getElementById('promo-ativo').checked = promo.ativo; document.getElementById('titulo-modal-promocao').innerText = 'Editar Cupom'; } 
    else { document.getElementById('promo-id').value = ''; document.getElementById('promo-codigo').value = ''; document.getElementById('promo-tipo').value = 'porcentagem'; document.getElementById('promo-valor').value = ''; document.getElementById('promo-ativo').checked = true; document.getElementById('titulo-modal-promocao').innerText = 'Novo Cupom'; }
    modalPromo.classList.add('active');
}
window.fecharModalPromocao = () => modalPromo.classList.remove('active');
window.salvarPromocao = async () => { const id = document.getElementById('promo-id').value; const codigo = document.getElementById('promo-codigo').value.toUpperCase().trim(); const tipo = document.getElementById('promo-tipo').value; const valor = parseFloat(document.getElementById('promo-valor').value); const ativo = document.getElementById('promo-ativo').checked; if(!codigo || isNaN(valor)) return alert("Preencha Código e Valor corretamente!"); const dados = { codigo: codigo, tipo: tipo, valor: valor, ativo: ativo }; if (id) await updateDoc(doc(db, "promocoes", id), dados); else await addDoc(collection(db, "promocoes"), dados); fecharModalPromocao(); }
window.excluirPromocao = async (id) => { if(confirm("Excluir este cupom?")) await deleteDoc(doc(db, "promocoes", id)); }

const docConfigRef = doc(db, "loja", "configuracoes");
onSnapshot(docConfigRef, (docSnap) => {
    if(docSnap.exists()) {
        const config = docSnap.data();
        document.getElementById('conf-status').checked = config.status_loja; 
        document.getElementById('conf-delivery-status').checked = config.delivery_status || false; 
        document.getElementById('conf-delivery-fee').value = config.delivery_fee || ""; 
        document.getElementById('conf-delivery-time').value = config.delivery_time || ""; 
        
        // MUDANÇA: Lê a chave PIX salva
        document.getElementById('conf-chave-pix').value = config.chave_pix || ""; 

        document.getElementById('conf-nome').value = config.nome_loja || ""; 
        document.getElementById('conf-frase').value = config.frase_efeito || ""; 
        document.getElementById('conf-telefone').value = config.telefone || ""; 
        document.getElementById('conf-endereco').value = config.endereco || ""; 
        document.getElementById('conf-instagram').value = config.instagram || ""; 
        document.getElementById('conf-facebook').value = config.facebook || ""; 
        document.getElementById('conf-hr-semana').value = config.hr_semana || ""; 
        document.getElementById('conf-hr-sabado').value = config.hr_sabado || ""; 
        document.getElementById('conf-hr-domingo').value = config.hr_domingo || "";
    }
});
window.salvarConfiguracoes = async function() {
    const dadosConfig = { 
        status_loja: document.getElementById('conf-status').checked, 
        delivery_status: document.getElementById('conf-delivery-status').checked, 
        delivery_time: document.getElementById('conf-delivery-time').value, 
        chave_pix: document.getElementById('conf-chave-pix').value, // MUDANÇA: Salva a Chave PIX
        nome_loja: document.getElementById('conf-nome').value, 
        frase_efeito: document.getElementById('conf-frase').value, 
        telefone: document.getElementById('conf-telefone').value, 
        endereco: document.getElementById('conf-endereco').value, 
        instagram: document.getElementById('conf-instagram').value, 
        facebook: document.getElementById('conf-facebook').value, 
        hr_semana: document.getElementById('conf-hr-semana').value, 
        hr_sabado: document.getElementById('conf-hr-sabado').value, 
        hr_domingo: document.getElementById('conf-hr-domingo').value 
    };
    try { await setDoc(docConfigRef, dadosConfig, {merge: true}); alert("Configurações salvas e aplicadas no site em tempo real!"); } catch (e) { alert("Erro ao salvar configurações."); }
}
