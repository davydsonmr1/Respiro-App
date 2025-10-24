import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function TelaPrincipal() {
  // Estados principais da aplicação
  const [jaViuOnboarding, setJaViuOnboarding] = useState(false);
  const [estaEmSessao, setEstaEmSessao] = useState(false);
  const [modalConfiguracoes, setModalConfiguracoes] = useState(false);
  const [modalSobre, setModalSobre] = useState(false);
  
  // Estados da sessão de respiração
  const [cicloAtual, setCicloAtual] = useState(0);
  const [faseAtual, setFaseAtual] = useState(''); // 'inspire', 'segure', 'expire'
  const [textoInstrucao, setTextoInstrucao] = useState('Toque para começar');
  const [sessaoConcluida, setSessaoConcluida] = useState(false);
  
  // Configurações do usuário (salvos no AsyncStorage)
  const [duracaoSessao, setDuracaoSessao] = useState(4); // 4 ciclos padrão
  const [guiaSom, setGuiaSom] = useState(false); // Padrão: desligado
  const [guiaVibracao, setGuiaVibracao] = useState(true); // Padrão: ligado
  const [guiaTexto, setGuiaTexto] = useState(true); // Padrão: ligado
  
  // Referências para animação e controle de tempo
  const animacaoEscala = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef(null);
  const soundInspire = useRef(null);
  const soundExpire = useRef(null);

  // Hook para carregar configurações salvas e verificar onboarding
  useEffect(() => {
    carregarConfiguracoes();
    verificarOnboarding();
    carregarSons();
    
    // Cleanup quando o componente for desmontado
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Função para verificar se o usuário já viu o onboarding
  const verificarOnboarding = async () => {
    try {
      const valor = await AsyncStorage.getItem('jaViuOnboarding');
      setJaViuOnboarding(valor === 'true');
    } catch (erro) {
      console.log('Erro ao verificar onboarding:', erro);
      setJaViuOnboarding(false);
    }
  };

  // Função para marcar o onboarding como concluído
  const concluirOnboarding = async () => {
    try {
      await AsyncStorage.setItem('jaViuOnboarding', 'true');
      setJaViuOnboarding(true);
    } catch (erro) {
      console.log('Erro ao salvar onboarding:', erro);
    }
  };

  // Função para carregar todas as configurações do AsyncStorage
  const carregarConfiguracoes = async () => {
    try {
      const configuracoes = await AsyncStorage.multiGet([
        'duracaoSessao',
        'guiaSom', 
        'guiaVibracao',
        'guiaTexto'
      ]);
      
      // Processa cada configuração carregada
      configuracoes.forEach(([chave, valor]) => {
        if (valor !== null) {
          switch (chave) {
            case 'duracaoSessao':
              setDuracaoSessao(parseInt(valor));
              break;
            case 'guiaSom':
              setGuiaSom(valor === 'true');
              break;
            case 'guiaVibracao':
              setGuiaVibracao(valor === 'true');
              break;
            case 'guiaTexto':
              setGuiaTexto(valor === 'true');
              break;
          }
        }
      });
    } catch (erro) {
      console.log('Erro ao carregar configurações:', erro);
    }
  };

  // Função para carregar os arquivos de áudio
  const carregarSons = async () => {
    try {
      // Carrega o som de inspiração
      const { sound: inspireSound } = await Audio.Sound.createAsync(
        require('../../assets/sons/inspirar.mp3'),
        { shouldPlay: false }
      );
      soundInspire.current = inspireSound;
      
      // Carrega o som de expiração
      const { sound: expireSound } = await Audio.Sound.createAsync(
        require('../../assets/sons/expirar.mp3'),
        { shouldPlay: false }
      );
      soundExpire.current = expireSound;
    } catch (erro) {
      console.log('Erro ao carregar sons (certifique-se de ter os arquivos inspirar.mp3 e expirar.mp3):', erro);
    }
  };

  // Função principal para iniciar uma sessão de respiração
  const iniciarSessao = () => {
    setEstaEmSessao(true);
    setCicloAtual(0);
    setSessaoConcluida(false);
    
    // Inicia o primeiro ciclo
    executarCiclo(0);
  };

  // Função que executa um ciclo completo de respiração (19 segundos)
  const executarCiclo = (numeroCiclo) => {
    console.log(`Iniciando ciclo ${numeroCiclo + 1} de ${duracaoSessao}`);
    
    // Fase 1: INSPIRE (4 segundos)
    setFaseAtual('inspire');
    if (guiaTexto) setTextoInstrucao('Inspire...');
    
    // Animação: círculo cresce por 4 segundos
    Animated.timing(animacaoEscala, {
      toValue: 1.2,
      duration: 4000,
      useNativeDriver: true,
    }).start();
    
    // Som de inspiração
    if (guiaSom && soundInspire.current) {
      soundInspire.current.replayAsync();
    }
    
    // Vibração contínua pesada durante inspiração
    if (guiaVibracao) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Após 4 segundos, passa para fase de segurar
    timeoutRef.current = setTimeout(() => {
      faseSegure(numeroCiclo);
    }, 4000);
  };

  // Fase 2: SEGURE a respiração (7 segundos)
  const faseSegure = (numeroCiclo) => {
    setFaseAtual('segure');
    if (guiaTexto) setTextoInstrucao('Segure...');
    
    // Círculo fica parado no tamanho máximo
    // Sem vibração ou som durante esta fase
    
    // Após 7 segundos, passa para fase de expirar
    timeoutRef.current = setTimeout(() => {
      faseExpire(numeroCiclo);
    }, 7000);
  };

  // Fase 3: EXPIRE (8 segundos)
  const faseExpire = (numeroCiclo) => {
    setFaseAtual('expire');
    if (guiaTexto) setTextoInstrucao('Expire...');
    
    // Animação: círculo diminui por 8 segundos
    Animated.timing(animacaoEscala, {
      toValue: 0.8,
      duration: 8000,
      useNativeDriver: true,
    }).start();
    
    // Som de expiração
    if (guiaSom && soundExpire.current) {
      soundExpire.current.replayAsync();
    }
    
    // Vibração: 8 pulsos leves (um por segundo)
    if (guiaVibracao) {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, i * 1000);
      }
    }
    
    // Após 8 segundos, verifica se deve continuar ou finalizar
    timeoutRef.current = setTimeout(() => {
      const proximoCiclo = numeroCiclo + 1;
      setCicloAtual(proximoCiclo);
      
      if (proximoCiclo < duracaoSessao) {
        // Continua para o próximo ciclo
        executarCiclo(proximoCiclo);
      } else {
        // Finaliza a sessão
        finalizarSessao();
      }
    }, 8000);
  };

  // Função para finalizar a sessão (automática ou manual)
  const finalizarSessao = () => {
    // Para todas as animações e timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Para todos os sons
    if (soundInspire.current) soundInspire.current.stopAsync();
    if (soundExpire.current) soundExpire.current.stopAsync();
    
    // Reseta a animação
    animacaoEscala.setValue(0.8);
    
    // Mostra mensagem de conclusão
    setSessaoConcluida(true);
    setTextoInstrucao('Sessão concluída.');
    
    // Após 3 segundos, volta ao estado inicial
    setTimeout(() => {
      setEstaEmSessao(false);
      setSessaoConcluida(false);
      setFaseAtual('');
      setCicloAtual(0);
      setTextoInstrucao('Toque para começar');
    }, 3000);
  };

  // Função para parar manualmente a sessão
  const pararSessao = () => {
    finalizarSessao();
  };

  // Funções para salvar configurações no AsyncStorage
  const salvarDuracaoSessao = async (novaDuracao) => {
    try {
      await AsyncStorage.setItem('duracaoSessao', novaDuracao.toString());
      setDuracaoSessao(novaDuracao);
    } catch (erro) {
      console.log('Erro ao salvar duração:', erro);
    }
  };

  const salvarConfiguracaoToggle = async (chave, valor) => {
    try {
      await AsyncStorage.setItem(chave, valor.toString());
      
      switch (chave) {
        case 'guiaSom':
          setGuiaSom(valor);
          break;
        case 'guiaVibracao':
          setGuiaVibracao(valor);
          break;
        case 'guiaTexto':
          setGuiaTexto(valor);
          break;
      }
    } catch (erro) {
      console.log(`Erro ao salvar ${chave}:`, erro);
    }
  };

  // Renderização condicional: Onboarding ou App principal
  if (!jaViuOnboarding) {
    return (
      <View style={estilos.containerOnboarding}>
        <StatusBar style="dark" />
        <View style={estilos.conteudoOnboarding}>
          <Text style={estilos.tituloOnboarding}>Respiro</Text>
          <Text style={estilos.subtituloOnboarding}>
            Alívio rápido para ansiedade com a técnica 4-7-8.
          </Text>
          <TouchableOpacity 
            style={estilos.botaoOnboarding}
            onPress={concluirOnboarding}
          >
            <Text style={estilos.textoBotaoOnboarding}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Renderização principal do aplicativo
  return (
    <View style={estilos.container}>
      <StatusBar style="dark" />
      
      {/* Botão de Configurações - só aparece quando não está em sessão */}
      {!estaEmSessao && (
        <TouchableOpacity 
          style={estilos.botaoConfiguracoes}
          onPress={() => setModalConfiguracoes(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      )}

      {/* Área principal tocável para iniciar sessão */}
      <TouchableOpacity 
        style={estilos.areaToque}
        onPress={!estaEmSessao ? iniciarSessao : null}
        activeOpacity={estaEmSessao ? 1 : 0.7}
      >
        <View style={estilos.containerCentral}>
          
          {/* Texto de instrução */}
          {(guiaTexto || !estaEmSessao) && (
            <Text style={estilos.textoInstrucao}>
              {textoInstrucao}
            </Text>
          )}
          
          {/* Círculo visual animado */}
          <Animated.View 
            style={[
              estilos.circuloRespiracao,
              {
                transform: [{ scale: animacaoEscala }]
              }
            ]}
          />
          
          {/* Indicador de progresso durante a sessão */}
          {estaEmSessao && (
            <Text style={estilos.textoProgresso}>
              Ciclo {cicloAtual + 1} de {duracaoSessao}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Botão para parar sessão - só aparece durante a sessão */}
      {estaEmSessao && !sessaoConcluida && (
        <TouchableOpacity 
          style={estilos.botaoParar}
          onPress={pararSessao}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal de Configurações */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalConfiguracoes}
        onRequestClose={() => setModalConfiguracoes(false)}
      >
        <View style={estilos.overlayModal}>
          <View style={estilos.containerModal}>
            
            {/* Cabeçalho do modal */}
            <View style={estilos.cabecalhoModal}>
              <Text style={estilos.tituloModal}>Configurações</Text>
              <TouchableOpacity 
                onPress={() => setModalConfiguracoes(false)}
                style={estilos.botaoFecharModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Duração da Sessão */}
            <View style={estilos.secaoConfiguracao}>
              <Text style={estilos.tituloSecao}>Duração da Sessão (Ciclos)</Text>
              <View style={estilos.opcoesDuracao}>
                {[4, 8, 12].map(opcao => (
                  <TouchableOpacity
                    key={opcao}
                    style={[
                      estilos.botaoOpcao,
                      duracaoSessao === opcao && estilos.botaoOpcaoSelecionado
                    ]}
                    onPress={() => salvarDuracaoSessao(opcao)}
                  >
                    <Text style={[
                      estilos.textoOpcao,
                      duracaoSessao === opcao && estilos.textoOpcaoSelecionado
                    ]}>
                      {opcao} {opcao === 4 ? '(Recomendado)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Configurações de Feedback */}
            <View style={estilos.secaoConfiguracao}>
              <Text style={estilos.tituloSecao}>Configurações de Feedback</Text>
              
              <View style={estilos.itemToggle}>
                <Text style={estilos.textoToggle}>Guia de Som</Text>
                <Switch 
                  value={guiaSom}
                  onValueChange={(valor) => salvarConfiguracaoToggle('guiaSom', valor)}
                />
              </View>
              
              <View style={estilos.itemToggle}>
                <Text style={estilos.textoToggle}>Guia de Vibração</Text>
                <Switch 
                  value={guiaVibracao}
                  onValueChange={(valor) => salvarConfiguracaoToggle('guiaVibracao', valor)}
                />
              </View>
              
              <View style={estilos.itemToggle}>
                <Text style={estilos.textoToggle}>Guia de Texto</Text>
                <Switch 
                  value={guiaTexto}
                  onValueChange={(valor) => salvarConfiguracaoToggle('guiaTexto', valor)}
                />
              </View>
            </View>

            {/* Link Sobre a Técnica */}
            <TouchableOpacity 
              style={estilos.linkSobre}
              onPress={() => setModalSobre(true)}
            >
              <Text style={estilos.textoLinkSobre}>Sobre a Técnica 4-7-8</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Sobre a Técnica (Modal dentro de Modal) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalSobre}
        onRequestClose={() => setModalSobre(false)}
      >
        <View style={estilos.overlayModal}>
          <View style={estilos.containerModalSobre}>
            
            <View style={estilos.cabecalhoModal}>
              <Text style={estilos.tituloModal}>Sobre a Técnica 4-7-8</Text>
              <TouchableOpacity 
                onPress={() => setModalSobre(false)}
                style={estilos.botaoFecharModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={estilos.textoSobre}>
              A técnica 4-7-8 é um exercício de respiração desenvolvido pelo Dr. Andrew Weil. 
              Ela ajuda a acalmar o sistema nervoso, reduzir a ansiedade e auxiliar no sono.
            </Text>

            <Text style={estilos.textoSobre}>
              Como funciona:{'\n'}
              • Inspire pelo nariz por 4 segundos{'\n'}
              • Segure a respiração por 7 segundos{'\n'}
              • Expire pela boca por 8 segundos{'\n'}
              • Repita o ciclo
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Estilos do aplicativo
const estilos = StyleSheet.create({
  // Estilos do Onboarding
  containerOnboarding: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  conteudoOnboarding: {
    alignItems: 'center',
  },
  tituloOnboarding: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  subtituloOnboarding: {
    fontSize: 18,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  botaoOnboarding: {
    backgroundColor: '#4299E1',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  textoBotaoOnboarding: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Estilos da Tela Principal
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  botaoConfiguracoes: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  areaToque: {
    flex: 1,
  },
  containerCentral: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoInstrucao: {
    fontSize: 24,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 40,
  },
  circuloRespiracao: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4299E1',
    opacity: 0.8,
    marginBottom: 30,
  },
  textoProgresso: {
    fontSize: 16,
    color: '#4A5568',
  },
  botaoParar: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#E53E3E',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Estilos dos Modais
  overlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerModal: {
    backgroundColor: '#fff',
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 15,
    padding: 20,
  },
  containerModalSobre: {
    backgroundColor: '#fff',
    width: width * 0.85,
    borderRadius: 15,
    padding: 20,
  },
  cabecalhoModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  botaoFecharModal: {
    padding: 5,
  },

  // Configurações - Duração
  secaoConfiguracao: {
    marginBottom: 25,
  },
  tituloSecao: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 15,
  },
  opcoesDuracao: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  botaoOpcao: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  botaoOpcaoSelecionado: {
    backgroundColor: '#4299E1',
  },
  textoOpcao: {
    color: '#4A5568',
    fontSize: 14,
  },
  textoOpcaoSelecionado: {
    color: '#fff',
    fontWeight: '600',
  },

  // Configurações - Toggles
  itemToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  textoToggle: {
    fontSize: 16,
    color: '#2D3748',
  },

  // Link Sobre
  linkSobre: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  textoLinkSobre: {
    color: '#4299E1',
    fontSize: 16,
    fontWeight: '500',
  },

  // Texto do Modal Sobre
  textoSobre: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 15,
  },
});