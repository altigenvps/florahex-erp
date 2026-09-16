import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Trash2, Settings, Box, Percent, 
  Calculator, Info, AlertCircle, Image as ImageIcon, Layers, Shield,
  Edit, Save, Upload, X, Truck, Target, CheckCircle, ChevronDown, ChevronUp, ShoppingBag, Truck as FastDelivery, Download, Loader2, LogOut, Lock, Mail, Key
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Kullanıcının kendi Firebase Config bilgileri
const userFirebaseConfig = {
  apiKey: "AIzaSyBkuVwLpOPD8s-qOX22hjmFQWnh-5Eu1kM",
  authDomain: "florahex-erp.firebaseapp.com",
  projectId: "florahex-erp",
  storageBucket: "florahex-erp.firebasestorage.app",
  messagingSenderId: "408045088937",
  appId: "1:408045088937:web:e5b310ed3511df00b1f9b8"
};

// Sistemin kendi test veritabanını EZİP, SADECE sizin veritabanınızı kullanmaya zorluyoruz:
const firebaseConfig = userFirebaseConfig; 
const appId = 'florahex-erp';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [activeTab, setActiveTab] = useState('materials');
  
  // Yetkilendirme (Auth) State'leri
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [isDbReady, setIsDbReady] = useState(false);

  // SABİT KATEGORİLER
  const CATEGORIES = ['Tray', 'Castle_Tray', 'Pot', 'Castle_Windows', 'Castle_Belt', 'Accessory'];

  // Varsayılan Hammadde
  const defaultMaterials = {
    petg: { brand: 'Esun', price1kg: 350, price3kg: 950, selectedWeight: '1kg' },
    support: { brand: 'Esun', price05kg: 220, price1kg: 400, price3kg: 1100, selectedWeight: '1kg' }
  };
  const [materials, setMaterials] = useState(defaultMaterials);

  // Veritabanı State'leri
  const [modules, setModules] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [shippings, setShippings] = useState([]);
  const [packagingTiers, setPackagingTiers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [safetyRules, setSafetyRules] = useState([]);
  const [margins, setMargins] = useState([]);
  const [sets, setSets] = useState([]);

  // Firebase Auth Dinleyicisi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error) {
      let errorMessage = "Bir hata oluştu.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "E-posta veya şifre hatalı.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Şifreniz en az 6 karakter olmalıdır.";
      } else {
        errorMessage = error.message;
      }
      setAuthError(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDbReady(false); // Veritabanı bağlantısını kes
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const basePath = `artifacts/${appId}/users/${user.uid}`;
    const unsubscribes = [];

    const syncCollection = (collectionName, setter) => {
      const q = collection(db, `${basePath}/${collectionName}`);
      const unsub = onSnapshot(q, (snap) => {
        setter(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (err) => console.error(`Error fetching ${collectionName}:`, err));
      unsubscribes.push(unsub);
    };

    syncCollection('modules', setModules);
    syncCollection('boxes', setBoxes);
    syncCollection('shippings', setShippings);
    syncCollection('packagingTiers', setPackagingTiers);
    syncCollection('commissions', setCommissions);
    syncCollection('taxes', setTaxes);
    syncCollection('safetyRules', setSafetyRules);
    syncCollection('margins', setMargins);
    syncCollection('sets', setSets);

    const unsubMaterials = onSnapshot(doc(db, `${basePath}/settings/materials`), (snap) => {
      if (snap.exists()) setMaterials(snap.data());
    }, (err) => console.error("Error fetching materials:", err));
    unsubscribes.push(unsubMaterials);

    setIsDbReady(true);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const getBasePath = () => `artifacts/${appId}/users/${user.uid}`;

  const saveToDb = async (collectionName, data, id = null) => {
    if (!user) return;
    const docId = id ? id.toString() : Date.now().toString();
    await setDoc(doc(db, `${getBasePath()}/${collectionName}`, docId), data);
  };

  const deleteFromDb = async (collectionName, id) => {
    if (!user) return;
    await deleteDoc(doc(db, `${getBasePath()}/${collectionName}`, id.toString()));
  };

  // --- HESAPLAMALAR VE FONKSİYONLAR ---
  const petgCostPerGram = materials.petg.selectedWeight === '3kg' ? materials.petg.price3kg / 3000 : materials.petg.price1kg / 1000;
  const supportCostPerGram = materials.support.selectedWeight === '0.5kg' ? materials.support.price05kg / 500 : (materials.support.selectedWeight === '3kg' ? materials.support.price3kg / 3000 : materials.support.price1kg / 1000);

  const saveMaterials = async () => {
    if (!user) return;
    await setDoc(doc(db, `${getBasePath()}/settings/materials`), materials);
    alert("Hammadde fiyatları başarıyla buluta kaydedildi!");
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // Modüller
  const initialModuleState = { code: '', name: '', category: CATEGORIES[0], petg: '', support: '', width: '', height: '', depth: '', image: null };
  const [newModule, setNewModule] = useState(initialModuleState);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const calculateModuleCost = (petg, support) => ((petg * petgCostPerGram) + (support * supportCostPerGram)).toFixed(2);
  const saveModule = async () => {
    if (!newModule.name || !newModule.code) return;
    const modData = { ...newModule, code: newModule.code.toUpperCase(), petg: parseFloat(newModule.petg)||0, support: parseFloat(newModule.support)||0, width: parseFloat(newModule.width)||0, height: parseFloat(newModule.height)||0, depth: parseFloat(newModule.depth)||0 };
    await saveToDb('modules', modData, editingModuleId);
    setNewModule(initialModuleState); setEditingModuleId(null);
  };

  // Kutular
  const calculateDesi = (w, h, d) => ((parseFloat(w)||0) * (parseFloat(h)||0) * (parseFloat(d)||0) / 3000).toFixed(2);
  const initialBoxState = { name: '', width: '', height: '', depth: '', cost: '' };
  const [newBox, setNewBox] = useState(initialBoxState);
  const [editingBoxId, setEditingBoxId] = useState(null);
  const saveBox = async () => {
    if(!newBox.name) return;
    await saveToDb('boxes', newBox, editingBoxId);
    setNewBox(initialBoxState); setEditingBoxId(null);
  };

  // Kargolar
  const initialShippingState = { company: '', minDesi: '', maxDesi: '', price: '' };
  const [newShipping, setNewShipping] = useState(initialShippingState);
  const [editingShippingId, setEditingShippingId] = useState(null);
  const saveShipping = async () => {
    if(!newShipping.company) return;
    await saveToDb('shippings', newShipping, editingShippingId);
    setNewShipping(initialShippingState); setEditingShippingId(null);
  };

  // Paketleme (Ambalaj)
  const initialPackState = { name: '', minCost: '', maxCost: '', cost: '', materials: '' };
  const [newPack, setNewPack] = useState(initialPackState);
  const [editingPackId, setEditingPackId] = useState(null);
  const savePack = async () => {
    if(!newPack.name) return;
    await saveToDb('packagingTiers', newPack, editingPackId);
    setNewPack(initialPackState); setEditingPackId(null);
  };

  // Komisyonlar
  const initialCommState = { name: '', rate: '', fixedFee: '' };
  const [newComm, setNewComm] = useState(initialCommState);
  const [editingCommId, setEditingCommId] = useState(null);
  const totalCommissionPercent = useMemo(() => commissions.reduce((sum, item) => sum + parseFloat(item.rate || 0), 0).toFixed(2), [commissions]);
  const totalFixedFee = useMemo(() => commissions.reduce((sum, item) => sum + parseFloat(item.fixedFee || 0), 0).toFixed(2), [commissions]);
  const saveComm = async () => {
    if(!newComm.name) return;
    await saveToDb('commissions', newComm, editingCommId);
    setNewComm(initialCommState); setEditingCommId(null);
  };

  // Vergiler
  const initialTaxState = { name: '', rate: '' };
  const [newTax, setNewTax] = useState(initialTaxState);
  const [editingTaxId, setEditingTaxId] = useState(null);
  const totalTaxPercent = useMemo(() => taxes.reduce((sum, item) => sum + parseFloat(item.rate || 0), 0).toFixed(1), [taxes]);
  const saveTax = async () => {
    if(!newTax.name) return;
    await saveToDb('taxes', newTax, editingTaxId);
    setNewTax(initialTaxState); setEditingTaxId(null);
  };

  // Güvenlik Payı
  const initialSafetyState = { name: '', threshold: '', percentageRate: '', fixedFee: '' };
  const [newSafety, setNewSafety] = useState(initialSafetyState);
  const [editingSafetyId, setEditingSafetyId] = useState(null);
  const saveSafety = async () => {
    if(!newSafety.name) return;
    await saveToDb('safetyRules', newSafety, editingSafetyId);
    setNewSafety(initialSafetyState); setEditingSafetyId(null);
  };

  // Kar Marjı
  const initialMarginState = { name: '', minCost: '', maxCost: '', multiplier: '' };
  const [newMargin, setNewMargin] = useState(initialMarginState);
  const [editingMarginId, setEditingMarginId] = useState(null);
  const saveMargin = async () => {
    if(!newMargin.name) return;
    await saveToDb('margins', newMargin, editingMarginId);
    setNewMargin(initialMarginState); setEditingMarginId(null);
  };

  // Setler
  const initialSetState = { image: null, selectedModules: [] }; 
  const [newSet, setNewSet] = useState(initialSetState);
  const [editingSetId, setEditingSetId] = useState(null);
  const [currentModuleSelection, setCurrentModuleSelection] = useState({ moduleId: '', qty: 1 });

  const generateSetName = (selectedMods, existingId) => {
    if (selectedMods.length === 0) return "S_XXX_FH_...";
    const setNumber = existingId ? existingId.substring(existingId.length - 3) : String(sets.length + 1).padStart(3, '0');
    let nameParts = [`S_${setNumber}`, 'FH'];
    CATEGORIES.forEach(cat => {
      const modsInCat = selectedMods.map(sm => ({ qty: sm.qty, mod: modules.find(m => m.id === sm.moduleId) }))
        .filter(item => item.mod && item.mod.category === cat).sort((a, b) => a.mod.code.localeCompare(b.mod.code)); 
      modsInCat.forEach(item => nameParts.push(`${item.mod.code.replace(/-/g, '_')}-${item.qty}`));
    });
    return nameParts.join('_');
  };

  const addModuleToSet = () => {
    if (!currentModuleSelection.moduleId || currentModuleSelection.qty < 1) return;
    const existing = newSet.selectedModules.find(m => m.moduleId === currentModuleSelection.moduleId);
    const updatedModules = existing 
      ? newSet.selectedModules.map(m => m.moduleId === currentModuleSelection.moduleId ? { ...m, qty: parseInt(m.qty) + parseInt(currentModuleSelection.qty) } : m)
      : [...newSet.selectedModules, { moduleId: currentModuleSelection.moduleId, qty: parseInt(currentModuleSelection.qty) }];
    setNewSet({ ...newSet, selectedModules: updatedModules });
    setCurrentModuleSelection({ moduleId: '', qty: 1 });
  };

  const newSetTotals = useMemo(() => {
    let petg = 0, support = 0, cost = 0;
    newSet.selectedModules.forEach(sm => {
      const mod = modules.find(m => m.id === sm.moduleId);
      if (mod) {
        petg += mod.petg * sm.qty; support += mod.support * sm.qty;
        cost += parseFloat(calculateModuleCost(mod.petg, mod.support)) * sm.qty;
      }
    });
    return { petg, support, cost: cost.toFixed(2) };
  }, [newSet.selectedModules, modules, petgCostPerGram, supportCostPerGram]);

  const saveSet = async () => {
    if (newSet.selectedModules.length === 0) return;
    const setId = editingSetId || `SET_${Date.now()}`;
    const setData = { name: generateSetName(newSet.selectedModules, editingSetId ? setId : null), image: newSet.image, modules: newSet.selectedModules, totals: newSetTotals };
    await saveToDb('sets', setData, setId);
    setNewSet(initialSetState); setEditingSetId(null);
  };

  const [expandedSetId, setExpandedSetId] = useState(null);

  // KARLILIK MOTORU
  const calculateSalesData = (set) => {
    const prodCost = parseFloat(set.totals.cost);
    let totalVolume = 0;
    let maxW = 0, maxH = 0, maxD = 0;
    
    set.modules.forEach(sm => {
        const mod = modules.find(m => m.id === sm.moduleId);
        if (mod) {
            const w = parseFloat(mod.width || 0) + 4;
            const h = parseFloat(mod.height || 0) + 4;
            const d = parseFloat(mod.depth || 0) + 4;
            totalVolume += (w * h * d) * sm.qty; 
            if (w > maxW) maxW = w;
            if (h > maxH) maxH = h;
            if (d > maxD) maxD = d;
        }
    });

    const validBoxes = boxes.filter(b => {
        const boxDims = [parseFloat(b.width), parseFloat(b.height), parseFloat(b.depth)].sort((a,b)=>b-a);
        const reqDims = [maxW, maxH, maxD].sort((a,b)=>b-a);
        const boxVol = parseFloat(b.width) * parseFloat(b.height) * parseFloat(b.depth);
        return (boxDims[0] >= reqDims[0] && boxDims[1] >= reqDims[1] && boxDims[2] >= reqDims[2] && boxVol >= totalVolume);
    });

    const selectedBox = validBoxes.length > 0 ? validBoxes.sort((a,b) => parseFloat(a.cost) - parseFloat(b.cost))[0] : null;
    const boxCost = selectedBox ? parseFloat(selectedBox.cost) : 0;
    const boxDesi = selectedBox ? parseFloat(calculateDesi(selectedBox.width, selectedBox.height, selectedBox.depth)) : 0;

    const shippingInfo = shippings.find(s => boxDesi >= parseFloat(s.minDesi) && boxDesi <= parseFloat(s.maxDesi));
    const shippingCost = shippingInfo ? parseFloat(shippingInfo.price) : 0;

    const packing = packagingTiers.find(p => prodCost >= parseFloat(p.minCost) && prodCost <= parseFloat(p.maxCost));
    const packingCost = packing ? parseFloat(packing.cost) : 0;

    let baseCost = prodCost + boxCost + shippingCost + packingCost;
    let safetyCost = 0;
    if(safetyRules.length > 0) {
        const rule = safetyRules[0]; 
        if (baseCost < parseFloat(rule.threshold)) safetyCost = baseCost * (parseFloat(rule.percentageRate) / 100);
        else safetyCost = parseFloat(rule.fixedFee);
    }
    
    const totalBaseCost = baseCost + safetyCost;
    
    // Kar Marjı Kuralı (Üretim maliyetine göre Kuralı buluyoruz)
    const margin = margins.find(m => prodCost >= parseFloat(m.minCost) && prodCost <= parseFloat(m.maxCost));
    const multiplier = margin ? parseFloat(margin.multiplier) : 1; 
    
    // SADECE PLASTİK MALİYETİ ÜZERİNDEN KÂR (ÇARPAN) UYGULANIYOR
    const profitOnProduction = prodCost * multiplier; 
    
    // Satış Fiyatı: (Üretim x Çarpan) + (Diğer tüm sabit maliyetler çıplak halde)
    const salePrice = profitOnProduction + boxCost + shippingCost + packingCost + safetyCost;

    const taxRate = parseFloat(totalTaxPercent) / 100;
    const totalTaxCost = salePrice * taxRate;

    const commRate = parseFloat(totalCommissionPercent) / 100;
    const totalCommCost = (salePrice * commRate) + parseFloat(totalFixedFee);

    const netProfit = salePrice - totalBaseCost - totalTaxCost - totalCommCost;
    const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    return {
        prodCost, selectedBox, boxCost, boxDesi, shippingInfo, shippingCost, packing, packingCost,
        safetyCost, totalBaseCost, multiplier, salePrice, totalTaxCost, totalCommCost, netProfit, profitMargin
    };
  };

  const exportToExcel = () => {
    const headers = ["SKU / Set Kodu", "Satış Fiyatı (TL)", "Üretim Maliyeti (TL)", "Koli Maliyeti (TL)", "Kargo Maliyeti (TL)", "Ambalaj (TL)", "Vergi (TL)", "Komisyon (TL)", "Net Kar (TL)", "Kar Marjı (%)", "Koli Tipi", "Kargo Desi", "Set İçeriği"];
    const rows = sets.map(set => {
      const data = calculateSalesData(set);
      const contentStr = set.modules.map(sm => {
         const mod = modules.find(m => m.id === sm.moduleId);
         return mod ? `${mod.name} (x${sm.qty})` : '';
      }).filter(Boolean).join(" + ");
      const formatNum = (num) => parseFloat(num).toFixed(2).replace('.', ',');
      return [ set.name, formatNum(data.salePrice), formatNum(data.prodCost), formatNum(data.boxCost), formatNum(data.shippingCost), formatNum(data.packingCost), formatNum(data.totalTaxCost), formatNum(data.totalCommCost), formatNum(data.netProfit), formatNum(data.profitMargin), data.selectedBox ? data.selectedBox.name : "Koli Bulunamadı", formatNum(data.boxDesi), contentStr ];
    });
    const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "FloraHex_Satis_Fiyatlari.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Yüklenme Ekranı (Auth için)
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-emerald-400 flex-col gap-4">
        <Loader2 className="animate-spin" size={48} />
        <h2 className="text-xl font-semibold">Güvenli Bağlantı Kuruluyor...</h2>
      </div>
    );
  }

  // --- GİRİŞ / KAYIT EKRANI (LOGIN) ---
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-slate-950 p-6 text-center border-b border-slate-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-900/30 text-emerald-400 mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Box className="text-emerald-400"/> FloraHex ERP</h1>
            <p className="text-slate-400 text-sm mt-2">Yetkili Yönetim Paneli</p>
          </div>
          
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
              {isLoginMode ? 'Sisteme Giriş Yapın' : 'Yönetici Hesabı Oluşturun'}
            </h2>
            
            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta Adresi</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400"><Mail size={18} /></span>
                  <input 
                    type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                    placeholder="ornek@florahex.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400"><Key size={18} /></span>
                  <input 
                    type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
                {isLoginMode ? 'Giriş Yap' : 'Hesabı Oluştur'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} 
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
              >
                {isLoginMode ? "İlk defa mı giriyorsunuz? Hesap Oluşturun" : "Zaten hesabınız var mı? Giriş Yapın"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Yüklenme Ekranı (Veritabanı için)
  if (!isDbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-emerald-400 flex-col gap-4">
        <Loader2 className="animate-spin" size={48} />
        <h2 className="text-xl font-semibold">Florahex ERP Bulut Veritabanına Bağlanıyor...</h2>
        <p className="text-sm text-slate-400">Verileriniz senkronize ediliyor</p>
      </div>
    );
  }

  // --- ANA YÖNETİM PANELİ (DASHBOARD) ---
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 flex-shrink-0">
        <div className="p-6 bg-slate-950 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2"><Box size={24} /> FloraHex</h1>
          <p className="text-xs mt-1 text-slate-500">Cloud ERP V1.0</p>
          <div className="mt-4 py-2 px-3 bg-slate-800 rounded flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             <span className="text-xs text-slate-300 truncate" title={user.email}>{user.email}</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
             <li className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">1. Üretim Maliyetleri</li>
             <li><button onClick={() => setActiveTab('materials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'materials' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Layers size={18} /> Hammadde</button></li>
             <li><button onClick={() => setActiveTab('modules')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'modules' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Box size={18} /> Modül Veritabanı</button></li>

             <li className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">2. Lojistik & Ambalaj</li>
             <li><button onClick={() => setActiveTab('boxes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'boxes' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Package size={18} /> Koli Veritabanı</button></li>
             <li><button onClick={() => setActiveTab('shipping')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'shipping' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><FastDelivery size={18} /> Kargo Fiyatları</button></li>
             <li><button onClick={() => setActiveTab('packaging')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'packaging' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Truck size={18} /> Paket İçeriği</button></li>

             <li className="px-4 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">3. Finans & Strateji</li>
             <li><button onClick={() => setActiveTab('commissions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'commissions' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Percent size={18} /> Tüm Kesintiler</button></li>
             <li><button onClick={() => setActiveTab('taxes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'taxes' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Calculator size={18} /> Vergi Yönetimi</button></li>
             <li><button onClick={() => setActiveTab('safety')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'safety' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Shield size={18} /> Güvenlik Payı</button></li>
             <li><button onClick={() => setActiveTab('margins')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'margins' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Target size={18} /> Kar Marjı (Çarpan)</button></li>

             <li className="px-4 py-2 mt-4 text-xs font-semibold text-emerald-700 bg-emerald-900/30 uppercase tracking-wider rounded">4. Üretim & Satış</li>
             <li><button onClick={() => setActiveTab('sets')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'sets' ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'hover:bg-slate-800 hover:text-white'}`}><Settings size={18} /> Set Oluştur</button></li>
             <li><button onClick={() => setActiveTab('sales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'sales' ? 'bg-emerald-600 text-white font-medium shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}><ShoppingBag size={18} /> Satış & Simülasyon</button></li>
          </ul>
        </nav>
        
        {/* Güvenli Çıkış Butonu */}
        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={handleLogout} 
             className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-slate-800 hover:bg-red-900/80 hover:text-red-300 text-slate-400 transition-colors text-sm font-medium"
           >
             <LogOut size={16} /> Güvenli Çıkış
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        
        {/* Hammadde */}
        {activeTab === 'materials' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Layers className="text-emerald-600" /> Hammadde / Filament Fiyatları</h2>
              <button onClick={saveMaterials} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"><Save size={18} /> Değişiklikleri Buluta Kaydet</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 border-b pb-2">PETG+ Filament</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Marka</label><input type="text" value={materials.petg.brand} onChange={(e) => setMaterials({...materials, petg: {...materials.petg, brand: e.target.value}})} className="w-full p-2 border border-gray-300 rounded" /></div>
                  <div className="flex gap-4">
                     <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">1 Kg (₺)</label><input type="number" value={materials.petg.price1kg} onChange={(e) => setMaterials({...materials, petg: {...materials.petg, price1kg: e.target.value}})} className="w-full p-2 border border-gray-300 rounded" /></div>
                     <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">3 Kg (₺)</label><input type="number" value={materials.petg.price3kg} onChange={(e) => setMaterials({...materials, petg: {...materials.petg, price3kg: e.target.value}})} className="w-full p-2 border border-gray-300 rounded" /></div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center border border-gray-100"><span className="text-sm text-gray-600">Üretimde Baz Alınacak:</span><select value={materials.petg.selectedWeight} onChange={(e) => setMaterials({...materials, petg: {...materials.petg, selectedWeight: e.target.value}})} className="p-1.5 border border-gray-300 rounded text-sm bg-white"><option value="1kg">1 Kg Makara</option><option value="3kg">3 Kg Makara</option></select></div>
                  <p className="text-right text-sm font-semibold text-emerald-600 mt-2">Maliyet: {(petgCostPerGram * 1000).toFixed(2)} ₺ / Kg</p>
                </div>
              </div>
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 border-b pb-2">Destek (Support) Filamenti</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Marka</label><input type="text" value={materials.support.brand} onChange={(e) => setMaterials({...materials, support: {...materials.support, brand: e.target.value}})} className="w-full p-2 border border-gray-300 rounded" /></div>
                  <div className="flex gap-2">
                     <div className="flex-1"><label className="block text-xs text-gray-600 mb-1">0.5 Kg (₺)</label><input type="number" value={materials.support.price05kg} onChange={(e) => setMaterials({...materials, support: {...materials.support, price05kg: e.target.value}})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                     <div className="flex-1"><label className="block text-xs text-gray-600 mb-1">1 Kg (₺)</label><input type="number" value={materials.support.price1kg} onChange={(e) => setMaterials({...materials, support: {...materials.support, price1kg: e.target.value}})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                     <div className="flex-1"><label className="block text-xs text-gray-600 mb-1">3 Kg (₺)</label><input type="number" value={materials.support.price3kg} onChange={(e) => setMaterials({...materials, support: {...materials.support, price3kg: e.target.value}})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center border border-gray-100"><span className="text-sm text-gray-600">Üretimde Baz Alınacak:</span><select value={materials.support.selectedWeight} onChange={(e) => setMaterials({...materials, support: {...materials.support, selectedWeight: e.target.value}})} className="p-1.5 border border-gray-300 rounded text-sm bg-white"><option value="0.5kg">0.5 Kg Makara</option><option value="1kg">1 Kg Makara</option><option value="3kg">3 Kg Makara</option></select></div>
                  <p className="text-right text-sm font-semibold text-emerald-600 mt-2">Maliyet: {(supportCostPerGram * 1000).toFixed(2)} ₺ / Kg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modüller */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Box className="text-emerald-600" /> Modül Veritabanı (Cloud)</h2>
            <div className={`p-6 rounded-xl shadow-sm border transition-colors ${editingModuleId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-semibold text-gray-800">{editingModuleId ? 'Modülü Düzenle' : 'Yeni Modül Ekle'}</h3>
                {editingModuleId && <button onClick={() => {setEditingModuleId(null); setNewModule(initialModuleState);}} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"><X size={16}/> İptal</button>}
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-32 flex flex-col items-center gap-2">
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                    {newModule.image ? <img src={newModule.image} alt="Önizleme" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" size={32} />}
                    <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer text-white text-xs font-medium transition-all">Yükle<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewModule)} /></label>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Ürün Kodu *</label><input type="text" value={newModule.code} onChange={(e) => setNewModule({...newModule, code: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm uppercase" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Modül Adı *</label><input type="text" value={newModule.name} onChange={(e) => setNewModule({...newModule, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Kategori *</label><select value={newModule.category} onChange={(e) => setNewModule({...newModule, category: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm bg-white">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">PETG+ (Gr)</label><input type="number" value={newModule.petg} onChange={(e) => setNewModule({...newModule, petg: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Destek (Gr)</label><input type="number" value={newModule.support} onChange={(e) => setNewModule({...newModule, support: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Gen (cm)</label><input type="number" value={newModule.width} onChange={(e) => setNewModule({...newModule, width: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Der (cm)</label><input type="number" value={newModule.depth} onChange={(e) => setNewModule({...newModule, depth: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Yük (cm)</label><input type="number" value={newModule.height} onChange={(e) => setNewModule({...newModule, height: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm" /></div>
                    <div><button onClick={saveModule} className={`w-full p-2 rounded text-sm font-medium text-white ${editingModuleId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{editingModuleId ? 'Güncelle' : 'Ekle'}</button></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600"><tr><th className="p-3">Görsel</th><th className="p-3">Ürün Kodu</th><th className="p-3">Kategori</th><th className="p-3">Modül Adı</th><th className="p-3">GxDxY (cm)</th><th className="p-3 text-right">Maliyet (₺)</th><th className="p-3 text-center">İşlem</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {modules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-gray-50">
                          <td className="p-3"><div className="w-8 h-8 bg-gray-100 rounded border overflow-hidden flex items-center justify-center">{mod.image ? <img src={mod.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={14} className="text-gray-400" />}</div></td>
                          <td className="p-3 font-mono font-medium text-emerald-700">{mod.code}</td>
                          <td className="p-3 text-xs"><span className="bg-gray-100 px-2 py-1 rounded border">{mod.category}</span></td>
                          <td className="p-3 font-medium text-gray-800">{mod.name}</td>
                          <td className="p-3 text-gray-500 text-xs">{mod.width}x{mod.depth}x{mod.height}</td>
                          <td className="p-3 font-bold text-gray-800 text-right">{calculateModuleCost(mod.petg, mod.support)} ₺</td>
                          <td className="p-3 text-center">
                            <button onClick={() => {setNewModule(mod); setEditingModuleId(mod.id);}} className="text-gray-400 hover:text-amber-500 p-1"><Edit size={16} /></button>
                            <button onClick={() => deleteFromDb('modules', mod.id)} className="text-gray-400 hover:text-red-500 p-1 ml-2"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
            </div>
          </div>
        )}

        {/* Kutular */}
        {activeTab === 'boxes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Package className="text-emerald-600" /> Koli & Kutu Veritabanı</h2>
            <div className={`p-5 rounded-xl shadow-sm border ${editingBoxId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingBoxId ? 'Kutuyu Düzenle' : 'Yeni Kutu Ekle'}</h3>{editingBoxId && <button onClick={() => {setEditingBoxId(null); setNewBox(initialBoxState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kutu Adı</label><input type="text" value={newBox.name} onChange={e=>setNewBox({...newBox, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Gen (cm)</label><input type="number" value={newBox.width} onChange={e=>setNewBox({...newBox, width: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Der (cm)</label><input type="number" value={newBox.depth} onChange={e=>setNewBox({...newBox, depth: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Boy (cm)</label><input type="number" value={newBox.height} onChange={e=>setNewBox({...newBox, height: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Maliyet (₺)</label><input type="number" value={newBox.cost} onChange={e=>setNewBox({...newBox, cost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
              </div>
              <div className="mt-4 flex justify-end"><button onClick={saveBox} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded text-sm font-medium">{editingBoxId ? 'Güncelle' : 'Kutu Ekle'}</button></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Kutu Adı</th><th className="p-4">GxDxY (cm)</th><th className="p-4">Otomatik Desi</th><th className="p-4">Maliyet</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {boxes.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{b.name}</td><td className="p-4 text-gray-500">{b.width} x {b.depth} x {b.height} cm</td>
                        <td className="p-4 font-bold text-emerald-600">{calculateDesi(b.width, b.height, b.depth)} Desi</td><td className="p-4">{b.cost} ₺</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewBox(b); setEditingBoxId(b.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('boxes', b.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Kargolar */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><FastDelivery className="text-emerald-600" /> Kargo Desi Fiyatları</h2>
            <div className={`p-5 rounded-xl shadow-sm border ${editingShippingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingShippingId ? 'Fiyatı Düzenle' : 'Yeni Kargo Fiyatı Ekle'}</h3>{editingShippingId && <button onClick={() => {setEditingShippingId(null); setNewShipping(initialShippingState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kargo Firması</label><input type="text" value={newShipping.company} onChange={e=>setNewShipping({...newShipping, company: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Min. Desi</label><input type="number" step="0.1" value={newShipping.minDesi} onChange={e=>setNewShipping({...newShipping, minDesi: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Max. Desi</label><input type="number" step="0.1" value={newShipping.maxDesi} onChange={e=>setNewShipping({...newShipping, maxDesi: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Ücret (₺)</label><input type="number" value={newShipping.price} onChange={e=>setNewShipping({...newShipping, price: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
              </div>
              <div className="mt-4 flex justify-end"><button onClick={saveShipping} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded text-sm font-medium">{editingShippingId ? 'Güncelle' : 'Ekle'}</button></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Firma Adı</th><th className="p-4">Desi Aralığı</th><th className="p-4">Gönderim Ücreti</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {shippings.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{s.company}</td><td className="p-4 text-gray-500">{s.minDesi} - {s.maxDesi} Desi</td>
                        <td className="p-4 font-bold text-emerald-600">{s.price} ₺</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewShipping(s); setEditingShippingId(s.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('shippings', s.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Paketleme */}
        {activeTab === 'packaging' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Truck className="text-emerald-600" /> Paket İçeriği (Sarf Malzemesi)</h2>
             <div className={`p-5 rounded-xl shadow-sm border ${editingPackId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingPackId ? 'Kademeyi Düzenle' : 'Yeni Kademe Ekle'}</h3>{editingPackId && <button onClick={() => {setEditingPackId(null); setNewPack(initialPackState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kademe Adı</label><input type="text" value={newPack.name} onChange={e=>setNewPack({...newPack, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Min. Üretim Maliyeti (₺)</label><input type="number" value={newPack.minCost} onChange={e=>setNewPack({...newPack, minCost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Max. Üretim Maliyeti (₺)</label><input type="number" value={newPack.maxCost} onChange={e=>setNewPack({...newPack, maxCost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">İçerik Maliyeti (₺)</label><input type="number" value={newPack.cost} onChange={e=>setNewPack({...newPack, cost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
              </div>
              <div className="mt-4"><label className="block text-xs mb-1">Paket İçeriği (Virgülle ayırın)</label><input type="text" placeholder="Örn: 2x Petek Kağıt, Tohum Hediyesi" value={newPack.materials} onChange={e=>setNewPack({...newPack, materials: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
              <div className="mt-4"><button onClick={savePack} className="w-full bg-slate-800 hover:bg-slate-900 text-white p-2 rounded text-sm font-medium">{editingPackId ? 'Güncelle' : 'Ekle'}</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packagingTiers.map(tier => (
                <div key={tier.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group">
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1"><button onClick={()=> {setNewPack(tier); setEditingPackId(tier.id);}} className="p-1.5 bg-amber-50 text-amber-600 rounded"><Edit size={14}/></button><button onClick={()=> deleteFromDb('packagingTiers', tier.id)} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button></div>
                  <h3 className="font-bold text-gray-800 mb-1">{tier.name}</h3><p className="text-xs text-gray-500 mb-4">Üretim Maliyeti: {tier.minCost} - {tier.maxCost} ₺ arası</p>
                  <p className="text-sm text-gray-600 mb-4">{tier.materials}</p><div className="border-t pt-3 flex justify-between items-center"><span className="text-xs text-gray-500">Maliyet</span><span className="font-bold text-emerald-600">{tier.cost} ₺</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Komisyonlar */}
        {activeTab === 'commissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Percent className="text-emerald-600" /> Tüm Satış Kesintileri</h2>
               <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-semibold shadow-sm border border-emerald-100 flex gap-4">
                  <span>Toplam Kesinti: %{totalCommissionPercent}</span>
                  <span>+ {totalFixedFee} ₺</span>
               </div>
            </div>
             <div className={`p-5 rounded-xl shadow-sm border ${editingCommId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingCommId ? 'Kesintiyi Düzenle' : 'Yeni Kesinti/Komisyon Ekle'}</h3>{editingCommId && <button onClick={() => {setEditingCommId(null); setNewComm(initialCommState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kurum / İsim</label><input type="text" value={newComm.name} onChange={e=>setNewComm({...newComm, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Kesinti Oranı (%)</label><input type="number" step="0.01" value={newComm.rate} onChange={e=>setNewComm({...newComm, rate: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Sabit Ücret (₺)</label><input type="number" step="0.01" value={newComm.fixedFee} onChange={e=>setNewComm({...newComm, fixedFee: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><button onClick={saveComm} className="w-full bg-slate-800 hover:bg-slate-900 text-white p-2 rounded text-sm font-medium">{editingCommId ? 'Güncelle' : 'Ekle'}</button></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Kurum / İsim</th><th className="p-4">Kesinti Oranı</th><th className="p-4">Sabit İşlem Ücreti</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {commissions.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{c.name}</td>
                        <td className="p-4 font-bold text-red-500">% {c.rate}</td>
                        <td className="p-4">{c.fixedFee} ₺</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewComm(c); setEditingCommId(c.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('commissions', c.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Vergiler */}
        {activeTab === 'taxes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Calculator className="text-emerald-600" /> Vergi Yönetimi</h2>
               <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold shadow-sm border border-red-100">
                  Toplam Vergi Yükü: %{totalTaxPercent}
               </div>
            </div>
             <div className={`p-5 rounded-xl shadow-sm border ${editingTaxId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingTaxId ? 'Vergiyi Düzenle' : 'Yeni Vergi Ekle'}</h3>{editingTaxId && <button onClick={() => {setEditingTaxId(null); setNewTax(initialTaxState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Vergi Adı</label><input type="text" value={newTax.name} onChange={e=>setNewTax({...newTax, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Vergi Oranı (%)</label><input type="number" step="0.1" value={newTax.rate} onChange={e=>setNewTax({...newTax, rate: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><button onClick={saveTax} className="w-full bg-slate-800 hover:bg-slate-900 text-white p-2 rounded text-sm font-medium">{editingTaxId ? 'Güncelle' : 'Ekle'}</button></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Vergi Adı</th><th className="p-4">Oran</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {taxes.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{t.name}</td>
                        <td className="p-4 font-bold text-red-500">% {t.rate}</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewTax(t); setEditingTaxId(t.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('taxes', t.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Güvenlik Payı */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Shield className="text-emerald-600" /> Güvenlik Payı (Risk Fonu)</h2>
             <div className={`p-5 rounded-xl shadow-sm border ${editingSafetyId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingSafetyId ? 'Kuralı Düzenle' : 'Yeni Güvenlik Kuralı Ekle'}</h3>{editingSafetyId && <button onClick={() => {setEditingSafetyId(null); setNewSafety(initialSafetyState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kural Adı</label><input type="text" value={newSafety.name} onChange={e=>setNewSafety({...newSafety, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Eşik Tutar (₺)</label><input type="number" value={newSafety.threshold} onChange={e=>setNewSafety({...newSafety, threshold: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Altı İçin Oran (%)</label><input type="number" step="0.1" value={newSafety.percentageRate} onChange={e=>setNewSafety({...newSafety, percentageRate: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Üstü İçin Sabit (₺)</label><input type="number" value={newSafety.fixedFee} onChange={e=>setNewSafety({...newSafety, fixedFee: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div className="md:col-span-5 flex justify-end"><button onClick={saveSafety} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded text-sm font-medium">{editingSafetyId ? 'Güncelle' : 'Ekle'}</button></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Kural Adı</th><th className="p-4">Eşik Tutar</th><th className="p-4">Eşik Altı Kesinti</th><th className="p-4">Eşik Üstü Kesinti</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {safetyRules.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{s.name}</td>
                        <td className="p-4">{s.threshold} ₺</td>
                        <td className="p-4 text-emerald-600 font-medium">% {s.percentageRate}</td>
                        <td className="p-4 text-emerald-600 font-medium">{s.fixedFee} ₺</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewSafety(s); setEditingSafetyId(s.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('safetyRules', s.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Kar Marjları */}
        {activeTab === 'margins' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Target className="text-emerald-600" /> Kâr Marjı (Satış Çarpanı)</h2>
             <div className={`p-5 rounded-xl shadow-sm border ${editingMarginId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-sm">{editingMarginId ? 'Çarpanı Düzenle' : 'Yeni Çarpan Kuralı Ekle'}</h3>{editingMarginId && <button onClick={() => {setEditingMarginId(null); setNewMargin(initialMarginState)}} className="text-xs text-gray-500 flex items-center gap-1"><X size={14}/> İptal</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2"><label className="block text-xs mb-1">Kural Adı</label><input type="text" value={newMargin.name} onChange={e=>setNewMargin({...newMargin, name: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Min. Maliyet (₺)</label><input type="number" value={newMargin.minCost} onChange={e=>setNewMargin({...newMargin, minCost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Max. Maliyet (₺)</label><input type="number" value={newMargin.maxCost} onChange={e=>setNewMargin({...newMargin, maxCost: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div><label className="block text-xs mb-1">Çarpan (X)</label><input type="number" step="0.1" value={newMargin.multiplier} onChange={e=>setNewMargin({...newMargin, multiplier: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div className="md:col-span-5 flex justify-end"><button onClick={saveMargin} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded text-sm font-medium">{editingMarginId ? 'Güncelle' : 'Ekle'}</button></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="p-4">Kural Adı</th><th className="p-4">Maliyet Aralığı</th><th className="p-4">Satış Çarpanı</th><th className="p-4 text-center">İşlem</th></tr></thead>
                  <tbody className="divide-y">
                    {margins.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium">{m.name}</td>
                        <td className="p-4">{m.minCost} ₺ - {m.maxCost} ₺</td>
                        <td className="p-4 font-bold text-emerald-600">X {m.multiplier}</td>
                        <td className="p-4 text-center">
                          <button onClick={()=> {setNewMargin(m); setEditingMarginId(m.id);}} className="text-gray-400 hover:text-amber-500 p-1 mr-2"><Edit size={16}/></button>
                          <button onClick={()=> deleteFromDb('margins', m.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Set Oluştur */}
        {activeTab === 'sets' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Settings className="text-emerald-600" /> Set Oluştur</h2>
             <div className={`p-6 rounded-xl shadow-sm border ${editingSetId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
               <div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-semibold text-gray-800">{editingSetId ? 'Seti Düzenle' : 'Yeni Set Oluştur'}</h3>{editingSetId && <button onClick={() => {setEditingSetId(null); setNewSet(initialSetState);}} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"><X size={16}/> İptal</button>}</div>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-6">
                  
                  <div className="w-full h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                    {newSet.image ? <img src={newSet.image} alt="Önizleme" className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon className="text-gray-400 mx-auto mb-2" size={32} /><span className="text-xs text-gray-500">Set Görseli Yükle</span></div>}
                    <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer text-white text-xs font-medium transition-all">Değiştir<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewSet)} /></label>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Seta Modül Ekle</h4>
                    <div className="space-y-3">
                      <select value={currentModuleSelection.moduleId} onChange={(e) => setCurrentModuleSelection({...currentModuleSelection, moduleId: e.target.value})} className="w-full p-2 border border-gray-300 rounded text-sm bg-white"><option value="">Modül Seçiniz...</option>{modules.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}</select>
                      <div className="flex gap-2"><div className="flex-1 relative"><span className="absolute left-3 top-2 text-gray-400 text-sm">Adet:</span><input type="number" min="1" value={currentModuleSelection.qty} onChange={(e) => setCurrentModuleSelection({...currentModuleSelection, qty: e.target.value})} className="w-full p-2 pl-12 border border-gray-300 rounded text-sm" /></div><button onClick={addModuleToSet} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium">Ekle</button></div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-2/3 flex flex-col">
                  <div className="bg-slate-900 text-white p-4 rounded-t-lg"><p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Otomatik Set Kodu</p><p className="font-mono text-lg text-emerald-400 break-all">{generateSetName(newSet.selectedModules, editingSetId)}</p></div>
                  <div className="flex-1 bg-white border-x border-gray-200 p-4 overflow-y-auto min-h-[150px]">
                     {newSet.selectedModules.map((sm, idx) => {
                          const mod = modules.find(m => m.id === sm.moduleId);
                          if(!mod) return null;
                          return (<div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 mb-2"><div className="flex items-center gap-3"><span className="text-sm font-medium text-gray-700">{mod.name}</span><span className="text-xs text-gray-400">({mod.width}x{mod.depth}x{mod.height}cm)</span></div><div className="flex items-center gap-4"><span className="text-sm font-bold text-gray-800 bg-white border px-2 py-1 rounded shadow-sm">x{sm.qty}</span><button onClick={() => setNewSet({...newSet, selectedModules: newSet.selectedModules.filter(m=>m.moduleId !== sm.moduleId)})} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div></div>);
                      })}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-b-lg flex justify-between items-center"><div className="flex gap-6 text-sm"><div><span className="text-gray-500 block text-xs">Top. PETG</span><span className="font-semibold">{newSetTotals.petg}g</span></div><div><span className="text-gray-500 block text-xs">Top. Destek</span><span className="font-semibold">{newSetTotals.support}g</span></div><div><span className="text-gray-500 block text-xs">Üretim Maliyeti</span><span className="font-bold text-emerald-700">{newSetTotals.cost} ₺</span></div></div><button onClick={saveSet} className={`px-6 py-2 rounded font-medium text-white shadow-sm flex items-center gap-2 ${editingSetId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-900'}`}>{editingSetId ? 'Güncelle' : 'Seti Kaydet'}</button></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
               <div className="p-4 border-b border-gray-200 bg-gray-50"><h3 className="font-semibold text-gray-700">Kayıtlı Setler ({sets.length})</h3></div>
                 <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-gray-100">
                        {sets.map(set => (
                           <tr key={set.id} className="hover:bg-gray-50">
                             <td className="p-4 w-16">
                               {set.image ? <img src={set.image} alt="" className="w-12 h-12 rounded object-cover border" /> : <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center"><ImageIcon size={16} className="text-gray-400"/></div>}
                             </td>
                             <td className="p-4">
                                <div className="font-mono font-bold text-emerald-700 text-sm mb-2">{set.name}</div>
                                <div className="flex flex-wrap gap-2">{set.modules.map((sm, i) => { const mod = modules.find(m => m.id === sm.moduleId); return mod ? <span key={i} className="text-gray-600 text-xs">{mod.name} (x{sm.qty}){i < set.modules.length -1 ? ' • ' : ''}</span> : null; })}</div>
                             </td>
                             <td className="p-4 font-bold text-gray-800 text-right">{set.totals.cost} ₺</td>
                             <td className="p-4 text-center">
                               <button onClick={() => {setNewSet({image:set.image, selectedModules:set.modules}); setEditingSetId(set.id);}} className="text-gray-400 hover:text-amber-500 p-2"><Edit size={16}/></button>
                               <button onClick={() => deleteFromDb('sets', set.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                             </td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
          </div>
        )}

        {/* Satış & Simülasyon */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                 <ShoppingBag className="text-emerald-600" /> Dinamik Satış & Fiyatlandırma
               </h2>
               <button 
                 onClick={exportToExcel} 
                 disabled={sets.length === 0}
                 className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-400 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm"
               >
                 <Download size={18} /> Excel'e Aktar (İkas Uyumlu)
               </button>
            </div>
            
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm flex gap-3"><Info size={20} className="flex-shrink-0"/> <p>Bu sayfada setlerinizin koli seçimi, paket malzemeleri, vergi ve komisyon giderleri otomatik olarak hesaplanarak net kârlılık oranları gösterilir.</p></div>

            <div className="space-y-3">
              {sets.length === 0 && <div className="text-center p-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">Henüz "Set Oluştur" sayfasından bir ürün oluşturmadınız.</div>}
              {sets.map(set => {
                 const data = calculateSalesData(set);
                 const isExpanded = expandedSetId === set.id;
                 
                 return (
                   <div key={set.id} className={`border rounded-xl bg-white overflow-hidden shadow-sm transition-all ${isExpanded ? 'ring-2 ring-emerald-500/20' : ''}`}>
                      <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-emerald-50/50" onClick={() => setExpandedSetId(isExpanded ? null : set.id)}>
                         <div>
                            <div className="font-mono font-bold text-emerald-800 text-base">{set.name}</div>
                            <div className="text-xs text-gray-500 mt-1">Önerilen Çarpan: X{data.multiplier}</div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Satış Fiyatı</div>
                              <div className="font-bold text-xl text-gray-900">{data.salePrice.toFixed(2)} ₺</div>
                            </div>
                            {isExpanded ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                         </div>
                      </div>

                      {isExpanded && (
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 border-b pb-2 text-sm uppercase">1. Operasyon Maliyeti</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-gray-600">Üretim (Plastik)</span><span className="font-medium">{data.prodCost.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Koli Maliyeti</span><span className="font-medium">{data.boxCost.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Kargo Maliyeti</span><span className="font-medium">{data.shippingCost.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Paket/Sarf Malzeme</span><span className="font-medium">{data.packingCost.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Güvenlik Payı (Risk Fonu)</span><span className="font-medium">{data.safetyCost.toFixed(2)} ₺</span></div>
                                </div>
                                <div className="pt-2 border-t flex justify-between items-center font-bold text-gray-800">
                                  <span>Toplam Baz Maliyet</span><span>{data.totalBaseCost.toFixed(2)} ₺</span>
                                </div>
                              </div>

                              <div className="space-y-4 lg:border-l lg:pl-8 border-gray-200">
                                <h4 className="font-semibold text-gray-700 border-b pb-2 text-sm uppercase">2. Finansal Özet</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-gray-600">Satış Fiyatı (Brüt)</span><span className="font-bold text-gray-900">{data.salePrice.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between text-red-500"><span className="">- Vergi Kesintisi (%{totalTaxPercent})</span><span className="font-medium">-{data.totalTaxCost.toFixed(2)} ₺</span></div>
                                  <div className="flex justify-between text-red-500"><span className="">- Komisyonlar (%{totalCommissionPercent})</span><span className="font-medium">-{data.totalCommCost.toFixed(2)} ₺</span></div>
                                </div>
                                <div className="pt-2 border-t mt-4">
                                  <div className="bg-emerald-900 text-white p-4 rounded-lg flex justify-between items-center shadow-inner">
                                     <span className="font-semibold text-emerald-100">NET KÂR</span>
                                     <div className="text-right">
                                        <div className="text-2xl font-bold">{data.netProfit.toFixed(2)} ₺</div>
                                        <div className="text-xs text-emerald-300">Marj: %{data.profitMargin.toFixed(1)}</div>
                                     </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 lg:border-l lg:pl-8 border-gray-200">
                                <h4 className="font-semibold text-gray-700 border-b pb-2 text-sm flex items-center gap-2 uppercase"><Package size={16}/> Paket Hazırlama Talimatı</h4>
                                <div className="bg-white border border-gray-200 p-4 rounded text-sm space-y-4 shadow-sm">
                                   <div>
                                      <span className="block text-xs text-gray-500 mb-1">Seçilen Koli & Kargo</span>
                                      {data.selectedBox ? (
                                        <div className="font-semibold text-gray-800">{data.selectedBox.name} <span className="text-xs font-normal text-gray-500">({data.selectedBox.width}x{data.selectedBox.depth}x{data.selectedBox.height}cm - {data.boxDesi} Desi)</span></div>
                                      ) : (
                                        <div className="text-red-500 font-medium text-xs">Uygun Koli Bulunamadı! Modül hacmi kolileri aşıyor.</div>
                                      )}
                                      <div className="text-gray-600 mt-1">{data.shippingInfo ? `${data.shippingInfo.company} ile gönderim` : 'Kargo eşleşmesi bulunamadı.'}</div>
                                   </div>
                                   <div>
                                      <span className="block text-xs text-gray-500 mb-1">Ambalaj İçeriği</span>
                                      <div className="text-gray-700">{data.packing ? data.packing.materials : 'Standart Paket'}</div>
                                   </div>
                                   <div>
                                      <span className="block text-xs text-gray-500 mb-1">Set İçeriği (Modüller)</span>
                                      <ul className="list-disc pl-4 text-gray-700">
                                         {set.modules.map((sm, i) => { 
                                            const mod = modules.find(m => m.id === sm.moduleId); 
                                            return mod ? <li key={i}>{mod.name} - <strong className="text-gray-900">x{sm.qty}</strong></li> : null; 
                                         })}
                                      </ul>
                                   </div>
                                </div>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
