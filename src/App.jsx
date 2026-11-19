import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ShoppingCart, Plus, Minus, X, LockKeyhole, PackagePlus, LogOut, IceCream, Search, ImagePlus, RefreshCw } from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const WHATSAPP = (import.meta.env.VITE_WHATSAPP || "5588992235590").replace(/\D/g, "");
const money = n => Number(n || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

const starter = [
  ["Coca-Cola lata 350 ml", null], ["Monster 473 ml", null], ["Red Bull 250 ml", null],
  ["Skol lata", null], ["Skol vidro", null], ["Heineken", null], ["Brahma", null],
  ["Gutinho", 1.50], ["Sorvete de 1 litro", 15.00]
];

export default function App() {
  const [products,setProducts] = useState([]);
  const [cart,setCart] = useState({});
  const [search,setSearch] = useState("");
  const [cartOpen,setCartOpen] = useState(false);
  const [checkout,setCheckout] = useState(false);
  const [adminOpen,setAdminOpen] = useState(false);
  const [session,setSession] = useState(null);
  const [loading,setLoading] = useState(true);
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const [form,setForm] = useState({name:"",address:"",delivery:"Entrega",payment:"Pix"});
  const [edit,setEdit] = useState(null);
  const [imageFile,setImageFile] = useState(null);

  async function loadProducts() {
    if (!supabase) { setLoading(false); return; }
    const {data,error} = await supabase.from("products").select("*").eq("active",true).order("name");
    if (error) setNotice("Não foi possível carregar os produtos: " + error.message);
    else setProducts(data || []);
    setLoading(false);
  }
  useEffect(() => {
    loadProducts();
    if (!supabase) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    const channel = supabase.channel("products-live").on("postgres_changes",{event:"*",schema:"public",table:"products"},loadProducts).subscribe();
    return ()=>{subscription.unsubscribe();supabase.removeChannel(channel);};
  }, []);

  const cartItems = products.filter(p=>cart[p.id]>0);
  const total = cartItems.reduce((s,p)=>s + Number(p.price)*cart[p.id],0);
  const count = Object.values(cart).reduce((a,b)=>a+b,0);
  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const setQty = (id,n) => setCart(c=>({...c,[id]:Math.max(0,n)}));

  async function signIn(email,password) {
    setBusy(true);
    setNotice("");

    try {
     console.log("Tentando login..."); const {data,error} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });console.log("Resposta do login:", {data, error});

      if(error) {
        setNotice("Erro no login: " + error.message);
      } else if(data.session) {
        setSession(data.session);
        setNotice("Login realizado com sucesso!");
      }
    } catch(error) {
      setNotice("Erro inesperado: " + error.message);
    } finally {
      setBusy(false);
    }
  }
  
  async function signOut(){await supabase.auth.signOut();setAdminOpen(false);}
  async function saveProduct(e) {
    e.preventDefault(); if(!supabase || !edit) return;
    setBusy(true);
    let image_url = edit.image_url || null;
    if(imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const {error:upErr} = await supabase.storage.from("product-images").upload(path,imageFile,{upsert:true});
      if(upErr){setNotice("Erro ao enviar foto: "+upErr.message);setBusy(false);return;}
      image_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const payload = {name:edit.name.trim(),price:Number(edit.price),stock:Number(edit.stock),image_url,description:edit.description||"",active:true};
    const result = edit.id ? await supabase.from("products").update(payload).eq("id",edit.id) : await supabase.from("products").insert(payload);
    if(result.error) setNotice("Erro ao salvar: "+result.error.message);
    else {setNotice("Produto salvo com sucesso.");setEdit(null);setImageFile(null);await loadProducts();}
    setBusy(false);
  }
  async function deleteProduct(id) {
    if(!confirm("Deseja excluir este produto?")) return;
    const {error}=await supabase.from("products").update({active:false}).eq("id",id);
    setNotice(error ? error.message : "Produto excluído.");loadProducts();
  }
  async function addStock(p) {
    const value=Number(prompt(`Quantas unidades deseja adicionar ao estoque de ${p.name}?`));
    if(!Number.isFinite(value)||value<=0) return;
    const {error}=await supabase.from("products").update({stock:Number(p.stock)+value}).eq("id",p.id);
    setNotice(error ? error.message : "Entrada de mercadoria registrada.");loadProducts();
  }
  async function finishOrder(e) {
    e.preventDefault();
    if(!form.name.trim() || (form.delivery==="Entrega"&&!form.address.trim())) {setNotice("Preencha seu nome e o endereço para entrega.");return;}
    setBusy(true);
    const items=cartItems.map(p=>({product_id:p.id,quantity:cart[p.id]}));
    const {data,error}=await supabase.rpc("place_order",{p_customer_name:form.name.trim(),p_address:form.delivery==="Entrega"?form.address.trim():"Retirada na loja",p_fulfillment:form.delivery,p_payment:form.payment,p_items:items});
    setBusy(false);
    if(error){setNotice("Não foi possível concluir: "+error.message);return;}
    const lines=cartItems.map(p=>`• ${p.name} — ${cart[p.id]} x ${money(p.price)} = ${money(p.price*cart[p.id])}`).join("\n");
    const msg=`🧊 *NOVO PEDIDO — PV BEBIDAS E GELADOS*\n\nCliente: ${form.name}\nTipo: ${form.delivery}\n${form.delivery==="Entrega"?"Endereço: "+form.address+"\n":""}Pagamento: ${form.payment}\n\n*Produtos:*\n${lines}\n\n*TOTAL: ${money(total)}*\n\nPedido registrado: ${data}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`,"_blank");
    setCart({});setCheckout(false);setCartOpen(false);setNotice("Pedido registrado! O WhatsApp foi aberto para você enviar a mensagem.");
    loadProducts();
  }

  if(!supabase) return <main className="setup"><div className="brandMark">PV</div><h1>PV Bebidas e Gelados</h1><p>Falta conectar o banco de dados Supabase.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>. Consulte o README incluído no projeto.</p></main>;

  return <div className="app">
    <header className="topbar"><a className="brand" href="#"><span className="brandMark">PV</span><span><b>PV Bebidas</b><small>e Gelados</small></span></a>
      <nav><a href="#catalogo">Produtos</a><button className="adminLink" onClick={()=>setAdminOpen(true)}><LockKeyhole size={16}/> Administração</button><button className="cartBtn" onClick={()=>setCartOpen(true)}><ShoppingCart size={18}/> Carrinho <b>{count}</b></button></nav>
    </header>
    <section className="hero"><div className="heroText"><span className="eyebrow">BEM GELADO. DO JEITO QUE VOCÊ GOSTA.</span><h1>Seu momento refrescante começa aqui.</h1><p>Bebidas, energéticos e sorvetes para deixar seu dia mais gostoso.</p><a className="primary" href="#catalogo">Ver produtos <span>→</span></a></div><div className="heroArt"><div className="ice ice1">❄</div><div className="ice ice2">✦</div><div className="heroCircle"><span>GELADO</span><strong>❄</strong><small>É MAIS GOSTOSO!</small></div></div></section>
    <main id="catalogo" className="catalog"><div className="sectionHead"><div><span className="eyebrow">ESCOLHA O SEU FAVORITO</span><h2>Nosso catálogo</h2></div><label className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar produto..."/></label></div>
      {notice && <div className="notice" onClick={()=>setNotice("")}>{notice} <X size={15}/></div>}
      {loading?<p>Carregando produtos...</p>:filtered.length===0?<p className="empty">Nenhum produto encontrado.</p>:<div className="products">{filtered.map(p=><article className="product" key={p.id}><div className="productImage">{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="placeholder"><IceCream size={38}/><small>PV GELADOS</small></div>}{p.stock<=0&&<span className="sold">ESGOTADO</span>}</div><div className="productInfo"><h3>{p.name}</h3><div className="productBottom"><strong>{money(p.price)}</strong><button disabled={p.stock<=0} onClick={()=>setQty(p.id,(cart[p.id]||0)+1)}><Plus size={17}/> Adicionar</button></div><small className="stock">{p.stock>0?`${p.stock} disponível(is)`:"Indisponível"}</small></div></article>)}</div>}
    </main>
    <footer><span className="brandMark">PV</span><div><b>PV Bebidas e Gelados</b><p>Qualidade e refrescância pertinho de você.</p></div><small>© {new Date().getFullYear()} PV Bebidas e Gelados</small></footer>

    {cartOpen&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setCartOpen(false)}><aside className="drawer"><div className="drawerHead"><h2>Seu carrinho</h2><button className="iconBtn" onClick={()=>setCartOpen(false)}><X/></button></div>{cartItems.length===0?<p className="empty">Seu carrinho está vazio.</p>:<><div className="cartList">{cartItems.map(p=><div className="cartLine" key={p.id}><div><b>{p.name}</b><small>{money(p.price)} cada</small></div><div className="qty"><button onClick={()=>setQty(p.id,cart[p.id]-1)}><Minus size={14}/></button><b>{cart[p.id]}</b><button disabled={cart[p.id]>=p.stock} onClick={()=>setQty(p.id,cart[p.id]+1)}><Plus size={14}/></button></div><strong>{money(p.price*cart[p.id])}</strong></div>)}</div><div className="total"><span>Total</span><b>{money(total)}</b></div><button className="primary full" onClick={()=>{setCartOpen(false);setCheckout(true)}}>Continuar pedido</button></>}</aside></div>}

    {checkout&&<div className="overlay"><section className="modal"><div className="drawerHead"><h2>Finalizar pedido</h2><button className="iconBtn" onClick={()=>setCheckout(false)}><X/></button></div><form onSubmit={finishOrder}><label>Seu nome<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Como podemos chamar você?"/></label><label>Como deseja receber?<select value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})}><option>Entrega</option><option>Retirada</option></select></label>{form.delivery==="Entrega"&&<label>Endereço de entrega<textarea required value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Rua, número, bairro e referência"/></label>}<label>Forma de pagamento<select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label><div className="total"><span>Total do pedido</span><b>{money(total)}</b></div><p className="hint">O pagamento será feito na entrega ou na retirada. Ao confirmar, o WhatsApp abrirá com os detalhes do pedido.</p><button className="primary full" disabled={busy}>{busy?"Registrando...":"Confirmar e enviar pelo WhatsApp"}</button></form></section></div>}

    {adminOpen&&<div className="overlay"><section className="modal adminModal"><div className="drawerHead"><h2>Área administrativa</h2><button className="iconBtn" onClick={()=>setAdminOpen(false)}><X/></button></div>{!session?<form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);signIn(d.get("email"),d.get("password"));}}><p className="hint">Acesso exclusivo do proprietário.</p><label>E-mail cadastrado no Supabase<input name="email" type="email" required placeholder="seu@email.com"/></label><label>Senha<input name="password" type="password" required placeholder="Sua senha"/></label><button className="primary full" type="submit" disabled={busy}>
  {busy ? "Entrando..." : "Entrar"}
</button><small className="hint">A senha inicial sugerida é 9361. Configure o usuário no Supabase seguindo o README.</small></form>:<><div className="adminActions"><button className="primary" onClick={()=>{setEdit({name:"",price:"",stock:0,description:"",image_url:""});setImageFile(null)}}><PackagePlus size={16}/> Novo produto</button><button className="secondary" onClick={signOut}><LogOut size={16}/> Sair</button></div>{edit&&<form className="editForm" onSubmit={saveProduct}><h3>{edit.id?"Editar produto":"Cadastrar produto"}</h3><label>Nome<input required value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></label><div className="two"><label>Preço (R$)<input required type="number" min="0" step="0.01" value={edit.price} onChange={e=>setEdit({...edit,price:e.target.value})}/></label><label>Estoque<input required type="number" min="0" step="1" value={edit.stock} onChange={e=>setEdit({...edit,stock:e.target.value})}/></label></div><label>Descrição (opcional)<input value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})}/></label><label className="fileLabel"><ImagePlus size={17}/> Foto do produto<input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])}/></label><div className="adminActions"><button className="primary" disabled={busy}>{busy?"Salvando...":"Salvar produto"}</button><button type="button" className="secondary" onClick={()=>setEdit(null)}>Cancelar</button></div></form>}<div className="adminProducts"><h3>Produtos e estoque</h3>{products.map(p=><div className="adminProduct" key={p.id}><div><b>{p.name}</b><small>{money(p.price)} · Estoque: {p.stock}</small></div><button className="secondary mini" onClick={()=>addStock(p)}>+ Estoque</button><button className="secondary mini" onClick={()=>setEdit({...p})}>Editar</button><button className="danger mini" onClick={()=>deleteProduct(p.id)}>Excluir</button></div>)}</div></>}</section></div>}
  </div>;
}
