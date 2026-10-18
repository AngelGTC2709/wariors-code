import { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  AVATAR_DEFAULT,
  AVATAR_OPCIONES,
  ESTADOS_ANIMO,
  FONDO_COLORES,
  LOGROS,
  MAX_XP_SEMANA,
  MENSAJES_DIA,
  PLAN_DIETA,
  SEMANA,
  TABS_AVATAR,
  detectarAnimo,
} from '@/constants/family-wellness';

const VERDE = '#1a9e5c';
const VERDE_DARK = '#0d5c33';
const ROSA = '#E8537A';
const MORADO = '#7C5CBF';

function BarraXP({ actual, maximo }: { actual: number; maximo: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: actual / maximo, duration: 1200, useNativeDriver: false }).start();
  }, [actual]);
  return (
    <View style={s.xpWrap}>
      <View style={s.xpBg}>
        <Animated.View
          style={[s.xpFill, { width: anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }]}
        />
      </View>
      <View style={s.xpRow}>
        <Text style={s.xpTxt}>{actual} XP</Text>
        <Text style={s.xpTxt}>{maximo} XP</Text>
      </View>
    </View>
  );
}

// ─── MODAL CONSTRUCTOR DE AVATAR TIPO XBOX ───────────────────────────────────
function ModalAvatarBuilder({
  visible, avatarActual, onClose, onSave,
}: {
  visible: boolean;
  avatarActual: typeof AVATAR_DEFAULT;
  onClose: () => void;
  onSave: (av: typeof AVATAR_DEFAULT) => void;
}) {
  const [av, setAv] = useState(avatarActual);
  const [tab, setTab] = useState<keyof typeof AVATAR_OPCIONES>('piel');
  const tabs = TABS_AVATAR;

  const fondoKey = AVATAR_OPCIONES.fondo[av.fondo];
  const fondoStyle = FONDO_COLORES[fondoKey] ?? { bg: '#F0FAF5', border: '#C6E8D6' };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🎭 Construye tu avatar</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Preview del avatar */}
          <View style={[s.avatarPreview, { backgroundColor: fondoStyle.bg, borderColor: fondoStyle.border }]}>
            <Text style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Vista previa</Text>
            <View style={s.avatarPreviewCircle}>
              {/* Fondo */}
              <Text style={[s.avatarLayer, { fontSize: 48, opacity: 0.3 }]}>
                {AVATAR_OPCIONES.fondo[av.fondo]}
              </Text>
              {/* Cara / piel */}
              <Text style={[s.avatarLayer, { fontSize: 54 }]}>👧🏻</Text>
              {/* Cabello */}
              <Text style={[s.avatarLayer, { fontSize: 36, top: 4 }]}>
                {AVATAR_OPCIONES.cabello[av.cabello]}
              </Text>
              {/* Ropa */}
              <Text style={[s.avatarLayer, { fontSize: 30, bottom: 0 }]}>
                {AVATAR_OPCIONES.ropa[av.ropa]}
              </Text>
              {/* Accesorio */}
              <Text style={[s.avatarLayer, { fontSize: 22, top: 0, right: 4 }]}>
                {AVATAR_OPCIONES.accesorio[av.accesorio]}
              </Text>
            </View>
          </View>

          {/* Tabs de categorías */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}>
            {tabs.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[s.tab, tab === t.id && s.tabActivo]}
                onPress={() => setTab(t.id)}
              >
                <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                <Text style={[s.tabLabel, tab === t.id && { color: VERDE }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Opciones de la categoría seleccionada */}
          <View style={s.opcionesGrid}>
            {AVATAR_OPCIONES[tab].map((op, i) => (
              <TouchableOpacity
                key={i}
                style={[s.opcionCard, av[tab] === i && s.opcionSeleccionada]}
                onPress={() => setAv(prev => ({ ...prev, [tab]: i }))}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 30 }}>{op}</Text>
                {av[tab] === i && <Text style={s.opcionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Guardar */}
          <TouchableOpacity
            style={s.guardarBtn}
            onPress={() => { onSave(av); onClose(); }}
          >
            <Text style={s.guardarBtnTxt}>✨ Guardar avatar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL PLAN DIETA FAMILIAR ────────────────────────────────────────────────
function ModalDietaFamiliar({
  visible, onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [diaActivo, setDiaActivo] = useState(0);
  const dia = PLAN_DIETA[diaActivo];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '90%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🥦 Plan Familiar Semanal</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Selector de días */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {PLAN_DIETA.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[s.diaTab, diaActivo === i && s.diaTabActivo]}
                onPress={() => setDiaActivo(i)}
              >
                <Text style={[s.diaTabTxt, diaActivo === i && { color: '#fff' }]}>
                  {d.dia.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.dietaDia}>{dia.dia}</Text>

            {[
              { label: '🌅 Desayuno', val: dia.desayuno },
              { label: '☀️ Comida',   val: dia.comida   },
              { label: '🌙 Cena',     val: dia.cena     },
            ].map((item, i) => (
              <View key={i} style={s.dietaItem}>
                <Text style={s.dietaLabel}>{item.label}</Text>
                <Text style={s.dietaVal}>{item.val}</Text>
              </View>
            ))}

            <View style={[s.dietaItem, { backgroundColor: '#FFF9E6', borderColor: '#FFD700' }]}>
              <Text style={s.dietaLabel}>👶 Para los peques</Text>
              <Text style={s.dietaVal}>{dia.kids}</Text>
            </View>

            <View style={s.dietaTip}>
              <Text style={s.dietaTipTxt}>
                💡 Tip: Involucra a los niños en la cocina. ¡Aprenden mejor lo que ayudan a preparar!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL DIARIO DE ÁNIMO ────────────────────────────────────────────────────
function ModalDiarioAnimo({
  visible, onClose, aniomHoy, onSelectAnimo,
}: {
  visible: boolean;
  onClose: () => void;
  aniomHoy: string;
  onSelectAnimo: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🌸 ¿Cómo te sientes hoy?</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Registrar tu ánimo ayuda a NutriBot a acompañarte mejor 💜
          </Text>

          <View style={s.animoGrid}>
            {ESTADOS_ANIMO.map(e => (
              <TouchableOpacity
                key={e.id}
                style={[s.animoCard, { borderColor: e.color },
                  aniomHoy === e.id && { backgroundColor: e.color + '22' }]}
                onPress={() => { onSelectAnimo(e.id); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 34 }}>{e.emoji}</Text>
                <Text style={[s.animoLabel, { color: e.color }]}>{e.label}</Text>
                {aniomHoy === e.id && <Text style={{ fontSize: 14, color: e.color }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Historial mini */}
          <View style={s.historicoAnimo}>
            <Text style={{ fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 8 }}>
              Esta semana:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SEMANA.map((d, i) => {
                const estado = ESTADOS_ANIMO.find(e => e.id === d.animo);
                return (
                  <View key={i} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{estado?.emoji ?? '😐'}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{d.dia}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL LOGROS ─────────────────────────────────────────────────────────────
function ModalLogros({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '85%' }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitulo}>🏆 Mis Logros</Text>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#888' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            {LOGROS.filter(l => l.desbloqueado).length} de {LOGROS.length} desbloqueados ✨
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {LOGROS.map((l, i) => (
              <View key={i} style={[s.logroCard, !l.desbloqueado && { opacity: 0.4 }]}>
                <View style={[s.logroEmojiBg, l.desbloqueado && { backgroundColor: '#FFF9E6' }]}>
                  <Text style={{ fontSize: 28 }}>{l.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.logroTitulo}>{l.titulo}</Text>
                  <Text style={s.logroDesc}>{l.desc}</Text>
                </View>
                {l.desbloqueado
                  ? <Text style={{ fontSize: 20 }}>⭐</Text>
                  : <Text style={{ fontSize: 16 }}>🔒</Text>
                }
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── MODAL NUTRIBOT CHAT (mejorado con empatía) ───────────────────────────────
function ModalNutriBot({
  visible, onClose, estadoAnimo,
}: {
  visible: boolean;
  onClose: () => void;
  estadoAnimo: string;
}) {
  const estadoInfo = ESTADOS_ANIMO.find(e => e.id === estadoAnimo);

  const systemPrompt = `Eres NutriBot, el mejor amigo virtual y guía de salud de Fanny. 
Hablas en español de México, cálido, cercano, como un amigo de verdad.
Eres empático, nunca juzgas y siempre das apoyo genuino.
Eres breve (2-3 oraciones máximo) y usas emojis con naturalidad.
El nombre del usuario es Fanny.
Su estado de ánimo actual es: ${estadoInfo?.label ?? 'normal'} ${estadoInfo?.emoji ?? '😊'}

REGLAS IMPORTANTES:
- Si detectas que Fanny está triste, ansiosa o que la situación es emocional: PRIMERO dale apoyo emocional de verdad, como un amigo que escucha. No cambies el tema a nutrición hasta que ella quiera.
- Frases de apoyo reales: "Oye, me alegra que me lo cuentes", "Eso suena difícil, ¿quieres contarme más?", "No estás sola, aquí estoy"
- Si está feliz, comparte su alegría y motívala.
- Si pregunta de nutrición o salud, ayúdala con consejos concretos y accesibles.
- Nunca suenes a robot ni a aplicación. Sé humano, cálido y real.`;

  const [msgs, setMsgs] = useState([
    {
      rol: 'bot',
      texto: estadoAnimo === 'triste' || estadoAnimo === 'estresada'
        ? `Hola Fanny 💜 Noto que hoy no estás en tu mejor momento... Estoy aquí contigo. ¿Me cuentas cómo te sientes?`
        : `¡Hola Fanny! 🌿 Soy NutriBot, tu amigo de salud. ¿En qué te ayudo hoy?`,
    },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Actualizar saludo si cambia el estado de ánimo
  useEffect(() => {
    setMsgs([{
      rol: 'bot',
      texto: estadoAnimo === 'triste' || estadoAnimo === 'estresada'
        ? `Hola Fanny 💜 Noto que hoy no estás en tu mejor momento... Estoy aquí contigo. ¿Me cuentas cómo te sientes?`
        : estadoAnimo === 'feliz'
        ? `¡Hola Fanny! 😊✨ ¡Qué bueno verte de buen ánimo hoy! ¿En qué te ayudo?`
        : `¡Hola Fanny! 🌿 Soy NutriBot. ¿Cómo puedo ayudarte hoy?`,
    }]);
  }, [estadoAnimo]);

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const esTristeza = detectarAnimo(userMsg);
    const newMsgs = [...msgs, { rol: 'user', texto: userMsg }];
    setMsgs(newMsgs);
    setLoading(true);

    // Si hay tristeza explícita, inyectar recordatorio extra al sistema
    const systemFinal = esTristeza
      ? systemPrompt + '\n\nFanny acaba de expresar algo que suena triste o difícil. Prioriza el apoyo emocional como un amigo de verdad. Escúchala primero.'
      : systemPrompt;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 350,
          system: systemFinal,
          messages: newMsgs.map(m => ({
            role: m.rol === 'bot' ? 'assistant' : 'user',
            content: m.texto,
          })),
        }),
      });
      const data = await res.json();
      const respuesta = data.content?.[0]?.text ?? '¡Ups! No pude responder. Intenta de nuevo.';
      setMsgs(prev => [...prev, { rol: 'bot', texto: respuesta }]);
    } catch {
      setMsgs(prev => [...prev, { rol: 'bot', texto: '❌ Sin conexión. Intenta más tarde.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.chatOverlay}>
        <View style={s.chatBox}>
          <View style={s.chatHeader}>
            <View style={s.chatBotIcon}><Text style={{ fontSize: 22 }}>🌿</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.chatBotNombre}>NutriBot</Text>
              <Text style={s.chatBotSub}>
                {estadoInfo
                  ? `Fanny está ${estadoInfo.label.toLowerCase()} ${estadoInfo.emoji}`
                  : 'Tu guía de salud y amigo'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.modalClose}>
              <Text style={{ fontSize: 18, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollRef} style={s.chatMsgs} contentContainerStyle={{ padding: 12, gap: 8 }}>
            {msgs.map((m, i) => (
              <View key={i} style={[s.msgRow, m.rol === 'user' && s.msgRowUser]}>
                {m.rol === 'bot' && (
                  <View style={s.botAvatarMini}>
                    <Text style={{ fontSize: 14 }}>🌿</Text>
                  </View>
                )}
                <View style={[s.msgBurbuja, m.rol === 'user' ? s.msgUser : s.msgBot]}>
                  <Text style={[s.msgTxt, m.rol === 'user' && { color: '#fff' }]}>{m.texto}</Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={s.msgRow}>
                <View style={s.botAvatarMini}><Text style={{ fontSize: 14 }}>🌿</Text></View>
                <View style={s.msgBot}>
                  <Text style={s.msgTxt}>escribiendo... 💭</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sugerencias rápidas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sugerencias}>
            {['¿Qué debería comer hoy?', 'Estoy un poco triste', '¡Logré mi meta!', '¿Cómo duermo mejor?'].map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={s.sugerenciaBtn}
                onPress={() => { setInput(sug); }}
              >
                <Text style={s.sugerenciaTxt}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.chatInputRow}>
            <TextInput
              style={s.chatInput}
              placeholder="Cuéntame o pregúntame..."
              placeholderTextColor="#aaa"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={enviar}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={s.chatSend} onPress={enviar} activeOpacity={0.8}>
              <Text style={{ fontSize: 18 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── PANTALLA PRINCIPAL ────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [avatar, setAvatar]               = useState(AVATAR_DEFAULT);
  const [showAvatarBuilder, setAvatarBuilder] = useState(false);
  const [showChat, setChat]               = useState(false);
  const [showDieta, setDieta]             = useState(false);
  const [showAnimo, setAnimo]             = useState(false);
  const [showLogros, setLogros]           = useState(false);
  const [estadoAnimo, setEstadoAnimo]     = useState('bien');

  const [stats, setStats] = useState([
    { icon: '💦', valor: 4,    label: 'vasos',   max: 8,     bg: '#EAF4FF', accent: '#3B9EE8' },
    { icon: '👣', valor: 3200, label: 'pasos',   max: 10000, bg: '#FFF4EA', accent: '#E8843B' },
    { icon: '🥝', valor: 2,    label: 'frutas',  max: 5,     bg: '#EAFAF0', accent: '#2DB76A' },
    { icon: '🌙', valor: 7,    label: 'hrs sueño', max: 9,   bg: '#F0EEFF', accent: '#7C5CBF' },
  ]);

  const [misiones, setMisiones] = useState([
    { icon: '🥗', titulo: 'Come una ensalada',    sub: '¡Completada! 🎉',   xp: 40, hecha: true  },
    { icon: '🎯', titulo: 'Camina 30 minutos',    sub: 'Te faltan 18 min',  xp: 50, hecha: false },
    { icon: '💧', titulo: 'Toma 8 vasos de agua', sub: 'Te faltan 4 vasos', xp: 30, hecha: false },
    { icon: '🛌', titulo: 'Duerme 8 horas',       sub: 'Meta nocturna',     xp: 35, hecha: false },
  ]);

  const [xp, setXp]     = useState(620);
  const [xpAnim]        = useState(new Animated.Value(0));
  const [xpFlash, setXpFlash] = useState(false);

  const msgDia = MENSAJES_DIA[new Date().getDay() % MENSAJES_DIA.length];

  const fondoKey  = AVATAR_OPCIONES.fondo[avatar.fondo];
  const fondoStyle = FONDO_COLORES[fondoKey] ?? { bg: '#F0FAF5', border: '#C6E8D6' };
  const animoInfo  = ESTADOS_ANIMO.find(e => e.id === estadoAnimo) ?? ESTADOS_ANIMO[1];

  const sumarStat = (i: number) => {
    setStats(prev => {
      const next = [...prev];
      if (next[i].valor < next[i].max) next[i] = { ...next[i], valor: next[i].valor + 1 };
      return next;
    });
  };

  const toggleMision = (i: number) => {
    setMisiones(prev => {
      const next = [...prev];
      const m = next[i];
      if (!m.hecha) {
        next[i] = { ...m, hecha: true, sub: '¡Completada! 🎉' };
        const nuevoXp = xp + m.xp;
        setXp(nuevoXp);
        setXpFlash(true);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(xpAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setXpFlash(false));
      } else {
        next[i] = { ...m, hecha: false, sub: 'Pendiente' };
      }
      return next;
    });
  };

  const formatStat = (stat: typeof stats[0]) => {
    if (stat.label === 'pasos') return `${(stat.valor / 1000).toFixed(1)}k`;
    if (stat.label === 'hrs sueño') return `${stat.valor}h`;
    return String(stat.valor);
  };

  return (
    <>
      <ModalAvatarBuilder
        visible={showAvatarBuilder}
        avatarActual={avatar}
        onClose={() => setAvatarBuilder(false)}
        onSave={setAvatar}
      />
      <ModalNutriBot
        visible={showChat}
        onClose={() => setChat(false)}
        estadoAnimo={estadoAnimo}
      />
      <ModalDietaFamiliar visible={showDieta} onClose={() => setDieta(false)} />
      <ModalDiarioAnimo
        visible={showAnimo}
        onClose={() => setAnimo(false)}
        aniomHoy={estadoAnimo}
        onSelectAnimo={setEstadoAnimo}
      />
      <ModalLogros visible={showLogros} onClose={() => setLogros(false)} />

      <ParallaxScrollView
        headerBackgroundColor={{ light: VERDE, dark: VERDE_DARK }}
        headerImage={
          <View style={s.headerContent}>
            <Text style={s.saludo}>¡Buenos días!</Text>
            <Text style={s.nombreHeader}>Fanny 👋</Text>
            <View style={s.rachaBadge}>
              <Text style={s.rachaTexto}>🔥 7 días seguidos</Text>
            </View>
          </View>
        }
      >
        {/* ── MENSAJE DEL DÍA ── */}
        <View style={s.mensajeDia}>
          <Text style={s.mensajeDiaTxt}>✨ {msgDia}</Text>
        </View>

        {/* ── TARJETA AVATAR con ánimo ── */}
        <ThemedView style={s.avatarCard}>
          <TouchableOpacity
            style={s.avatarWrap}
            onPress={() => setAvatarBuilder(true)}
            activeOpacity={0.8}
          >
            <View style={[s.avatarCirculo, { backgroundColor: fondoStyle.bg, borderColor: fondoStyle.border }]}>
              {/* Avatar construido */}
              <Text style={{ fontSize: 16, position: 'absolute', opacity: 0.25 }}>
                {AVATAR_OPCIONES.fondo[avatar.fondo]}
              </Text>
              <Text style={{ fontSize: 44, zIndex: 2 }}>👧🏻</Text>
              <Text style={{ fontSize: 22, position: 'absolute', top: 2, zIndex: 3 }}>
                {AVATAR_OPCIONES.cabello[avatar.cabello]}
              </Text>
              <Text style={{ fontSize: 18, position: 'absolute', bottom: 2, zIndex: 3 }}>
                {AVATAR_OPCIONES.ropa[avatar.ropa]}
              </Text>
              <Text style={{ fontSize: 14, position: 'absolute', top: 2, right: 2, zIndex: 4 }}>
                {AVATAR_OPCIONES.accesorio[avatar.accesorio]}
              </Text>
            </View>
            <View style={s.nivelBadge}>
              <Text style={s.nivelTxt}>Nv. 5</Text>
            </View>
            <View style={s.editBadge}>
              <Text style={{ fontSize: 10 }}>🎭</Text>
            </View>
          </TouchableOpacity>

          <View style={s.avatarInfo}>
            <ThemedText type="defaultSemiBold" style={s.avatarNombre}>
              Fanny ✨
            </ThemedText>

            {/* Estado de ánimo actual */}
            <TouchableOpacity
              style={[s.animoBadge, { borderColor: animoInfo.color }]}
              onPress={() => setAnimo(true)}
            >
              <Text style={{ fontSize: 14 }}>{animoInfo.emoji}</Text>
              <Text style={[s.animoBadgeTxt, { color: animoInfo.color }]}>
                {animoInfo.label}
              </Text>
              <Text style={{ fontSize: 10, color: '#ccc' }}>›</Text>
            </TouchableOpacity>

            <ThemedText style={s.avatarSub}>¡Casi llegas al nivel 6!</ThemedText>
            <Animated.View style={{ opacity: xpFlash ? xpAnim.interpolate({ inputRange:[0,0.5,1], outputRange:[1,1.4,1] }) : 1 }}>
              {xpFlash && (
                <Animated.Text style={[s.xpFlashTxt, { opacity: xpAnim, transform: [{ translateY: xpAnim.interpolate({ inputRange:[0,1], outputRange:[0,-20] }) }] }]}>
                  +XP ✨
                </Animated.Text>
              )}
              <BarraXP actual={xp} maximo={1000} />
            </Animated.View>
          </View>
        </ThemedView>

        {/* ── ACCESOS RÁPIDOS ── */}
        <View style={s.accesosRow}>
          {[
            { icon: '🏆', label: 'Logros',  onPress: () => setLogros(true), color: '#FFF9E6', border: '#FFD700' },
            { icon: '🥦', label: 'Dieta',   onPress: () => setDieta(true),  color: '#F0FAF5', border: '#2DB76A' },
            { icon: '🌸', label: 'Ánimo',   onPress: () => setAnimo(true),  color: '#FFF0F5', border: '#E8537A' },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={[s.accesoCard, { backgroundColor: a.color, borderColor: a.border }]}
              onPress={a.onPress} activeOpacity={0.8}>
              <Text style={{ fontSize: 26 }}>{a.icon}</Text>
              <Text style={s.accesoLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── STATS DEL DÍA ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Hoy</ThemedText>
        </ThemedView>

        <View style={s.statsRow}>
          {stats.map((stat, i) => (
            <View key={i} style={[s.statCard, { backgroundColor: stat.bg, borderTopColor: stat.accent }]}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={[s.statVal, { color: stat.accent }]}>{formatStat(stat)}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
              <TouchableOpacity
                style={[s.statPlus, { backgroundColor: stat.accent }]}
                onPress={() => sumarStat(i)}
                activeOpacity={0.7}
              >
                <Text style={s.statPlusTxt}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── HISTORIAL SEMANAL ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Esta semana</ThemedText>
        </ThemedView>

        <ThemedView style={s.semanaCard}>
          <View style={s.semanaBarras}>
            {SEMANA.map((d, i) => {
              const hoy    = i === 6;
              const alto   = Math.round((d.xp / MAX_XP_SEMANA) * 80);
              const estado = ESTADOS_ANIMO.find(e => e.id === d.animo);
              return (
                <View key={i} style={s.semanaCol}>
                  <Text style={{ fontSize: 8 }}>{estado?.emoji ?? '😐'}</Text>
                  <Text style={s.semanaXp}>{d.xp}</Text>
                  <View style={s.semanaBarBg}>
                    <View style={[s.semanaBar, { height: alto, backgroundColor: hoy ? VERDE : '#C6E8D6' }]} />
                  </View>
                  <Text style={[s.somanaDia, hoy && { color: VERDE, fontWeight: '900' }]}>{d.dia}</Text>
                  <Text style={s.semanaEstrellas}>
                    {d.completas === 3 ? '⭐⭐⭐' : d.completas === 2 ? '⭐⭐' : '⭐'}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={s.semanaResumen}>
            <Text style={s.semanaResumenTxt}>🏆 Mejor día: Jueves · 750 XP</Text>
          </View>
        </ThemedView>

        {/* ── MISIONES ── */}
        <ThemedView style={s.secHeader}>
          <ThemedText type="subtitle" style={s.secTitulo}>Misiones del día</ThemedText>
        </ThemedView>

        {misiones.map((m, i) => (
          <TouchableOpacity key={i} onPress={() => toggleMision(i)} activeOpacity={0.75}>
            <ThemedView style={[s.misionCard, m.hecha && s.misionHecha]}>
              <View style={s.mIconWrap}>
                <Text style={s.mIcon}>{m.icon}</Text>
              </View>
              <View style={s.mTexto}>
                <ThemedText type="defaultSemiBold" style={s.mTitulo}>{m.titulo}</ThemedText>
                <ThemedText style={s.mSub}>{m.sub}</ThemedText>
              </View>
              {m.hecha ? (
                <Text style={s.check}>✅</Text>
              ) : (
                <View style={s.xpBadge}>
                  <Text style={s.xpBadgeTxt}>+{m.xp} XP</Text>
                </View>
              )}
            </ThemedView>
          </TouchableOpacity>
        ))}

        {/* ── BOTÓN DIETA FAMILIAR ── */}
        <TouchableOpacity style={[s.chatBtn, { backgroundColor: MORADO }]} activeOpacity={0.85} onPress={() => setDieta(true)}>
          <View style={[s.botAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={{ fontSize: 26 }}>🥦</Text>
          </View>
          <View style={s.botInfo}>
            <Text style={s.botTitulo}>Plan de dieta familiar</Text>
            <Text style={s.botSub}>Menú semanal para todos 👨‍👩‍👧</Text>
          </View>
          <Text style={s.botArrow}>›</Text>
        </TouchableOpacity>

        {/* ── BOTÓN NUTRIBOT ── */}
        <TouchableOpacity style={s.chatBtn} activeOpacity={0.85} onPress={() => setChat(true)}>
          <View style={s.botAvatar}>
            <Text style={{ fontSize: 26 }}>🌿</Text>
          </View>
          <View style={s.botInfo}>
            <Text style={s.botTitulo}>Habla con NutriBot</Text>
            <Text style={s.botSub}>
              {estadoAnimo === 'triste' || estadoAnimo === 'estresada'
                ? '💜 Estoy aquí para escucharte'
                : 'Tu guía de salud y amigo personal'}
            </Text>
          </View>
          <Text style={s.botArrow}>›</Text>
        </TouchableOpacity>

      </ParallaxScrollView>
    </>
  );
}

// ─── ESTILOS ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // HEADER
  headerContent: { position: 'absolute', bottom: 24, left: 24 },
  saludo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  nombreHeader: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  rachaBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  rachaTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // MENSAJE DEL DÍA
  mensajeDia: { backgroundColor: '#FFF9E6', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFD966' },
  mensajeDiaTxt: { fontSize: 13, color: '#856B00', fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  // AVATAR CARD
  avatarCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EDE8', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  avatarWrap: { position: 'relative', marginRight: 16 },
  avatarCirculo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  avatarLayer: { position: 'absolute' },
  nivelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: VERDE, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 2, borderColor: '#fff' },
  nivelTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  editBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#fff', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#E8EDE8' },
  avatarInfo: { flex: 1 },
  avatarNombre: { fontSize: 16, color: '#111' },
  avatarSub: { fontSize: 12, opacity: 0.5, marginBottom: 8, marginTop: 2 },

  // ÁNIMO BADGE
  animoBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, marginBottom: 4, gap: 4, backgroundColor: '#fff' },
  animoBadgeTxt: { fontSize: 12, fontWeight: '800' },

  // XP
  xpFlashTxt: { fontSize: 13, fontWeight: '900', color: VERDE, position: 'absolute', top: -20, left: 0 },
  xpWrap: {},
  xpBg: { height: 8, backgroundColor: '#EEF2EE', borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: VERDE, borderRadius: 8 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpTxt: { fontSize: 10, color: '#aaa', fontWeight: '700' },

  // ACCESOS RÁPIDOS
  accesosRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  accesoCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, gap: 4 },
  accesoLabel: { fontSize: 11, fontWeight: '800', color: '#444' },

  // SEC HEADER
  secHeader: { marginTop: 12, marginBottom: 10, backgroundColor: 'transparent' },
  secTitulo: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3, color: '#111' },

  // STATS
  statsRow: { flexDirection: 'row', marginBottom: 4, gap: 8, flexWrap: 'wrap' },
  statCard: { width: '22%', flexGrow: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: '#EEF0EE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#888', fontWeight: '700', marginTop: 2, marginBottom: 8, textAlign: 'center' },
  statPlus: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statPlusTxt: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },

  // SEMANA
  semanaCard: { borderRadius: 20, padding: 16, marginBottom: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EDE8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  semanaBarras: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  semanaCol: { alignItems: 'center', flex: 1 },
  semanaXp: { fontSize: 8, color: '#bbb', fontWeight: '700', marginBottom: 2 },
  semanaBarBg: { width: 20, height: 80, borderRadius: 6, backgroundColor: '#F0F5F0', justifyContent: 'flex-end', overflow: 'hidden' },
  semanaBar: { width: '100%', borderRadius: 6 },
  somanaDia: { fontSize: 11, color: '#888', fontWeight: '700', marginTop: 4 },
  semanaEstrellas: { fontSize: 7, marginTop: 2 },
  semanaResumen: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#F0F0F0' },
  semanaResumenTxt: { fontSize: 12, color: '#666', fontWeight: '700', textAlign: 'center' },

  // MISIONES
  misionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAEEEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  misionHecha: { opacity: 0.45 },
  mIconWrap: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#F2FAF5', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#D4EDE0' },
  mIcon: { fontSize: 24 },
  mTexto: { flex: 1 },
  mTitulo: { fontSize: 14, color: '#111' },
  mSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  check: { fontSize: 20 },
  xpBadge: { backgroundColor: VERDE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  xpBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // BOTONES PRINCIPALES
  chatBtn: { backgroundColor: VERDE, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12, shadowColor: VERDE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  botAvatar: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  botInfo: { flex: 1 },
  botTitulo: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  botSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 },
  botArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 32, fontWeight: '300' },

  // MODAL BASE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { flex: 1, fontSize: 18, fontWeight: '900', color: '#111' },
  modalClose: { padding: 8 },

  // AVATAR BUILDER
  avatarPreview: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 2 },
  avatarPreviewCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: 'rgba(255,255,255,0.6)' },
  tabsScroll: { marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, alignItems: 'center', backgroundColor: '#F5F5F5', flexDirection: 'row', gap: 4 },
  tabActivo: { backgroundColor: '#E8F7EF', borderWidth: 1.5, borderColor: VERDE },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#888' },
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  opcionCard: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: '#eee' },
  opcionSeleccionada: { borderColor: VERDE, backgroundColor: '#E8F7EF', borderWidth: 2 },
  opcionCheck: { fontSize: 12, color: VERDE, fontWeight: '900' },
  guardarBtn: { backgroundColor: VERDE, borderRadius: 14, padding: 16, alignItems: 'center' },
  guardarBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // DIETA
  diaTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F0F0F0' },
  diaTabActivo: { backgroundColor: VERDE },
  diaTabTxt: { fontSize: 13, fontWeight: '800', color: '#555' },
  dietaDia: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 12 },
  dietaItem: { backgroundColor: '#F8FAF8', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8EDE8' },
  dietaLabel: { fontSize: 13, fontWeight: '800', color: VERDE, marginBottom: 6 },
  dietaVal: { fontSize: 14, color: '#333', lineHeight: 20 },
  dietaTip: { backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FFD966', marginTop: 4 },
  dietaTipTxt: { fontSize: 13, color: '#856B00', lineHeight: 18 },

  // ÁNIMO
  animoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  animoCard: { width: '30%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, backgroundColor: '#fafafa' },
  animoLabel: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  historicoAnimo: { backgroundColor: '#F8FAF8', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8EDE8' },

  // LOGROS
  logroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAEEEA', gap: 12 },
  logroEmojiBg: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  logroTitulo: { fontSize: 14, fontWeight: '900', color: '#111' },
  logroDesc: { fontSize: 12, color: '#888', marginTop: 2 },

  // CHAT
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  chatBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '85%', overflow: 'hidden' },
  chatHeader: { backgroundColor: VERDE, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatBotIcon: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chatBotNombre: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatBotSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  chatMsgs: { flex: 1, backgroundColor: '#F8FAF8' },
  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 6 },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatarMini: { width: 28, height: 28, backgroundColor: '#E8F7EF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  msgBurbuja: { maxWidth: '75%', borderRadius: 16, padding: 10 },
  msgBot: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8EDE8' },
  msgUser: { backgroundColor: VERDE },
  msgTxt: { fontSize: 14, color: '#222', lineHeight: 20 },
  sugerencias: { backgroundColor: '#F8FAF8', paddingVertical: 8, paddingHorizontal: 12 },
  sugerenciaBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: '#E0E8E0' },
  sugerenciaTxt: { fontSize: 12, color: '#555', fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderColor: '#EEF0EE', backgroundColor: '#fff' },
  chatInput: { flex: 1, backgroundColor: '#F5F7F5', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111', borderWidth: 1, borderColor: '#E8EDE8', maxHeight: 80 },
  chatSend: { width: 44, height: 44, backgroundColor: VERDE, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
