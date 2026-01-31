import { Component, input, output, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../toast/toast.component';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.component';
import { RadioService } from '../../../core/services/radio.service';
import { SettingsService } from '../../../core/services/settings.service';
import { RadioConfig, RadioVoice, RadioPersonalityPreset } from '../../../models';

@Component({
  selector: 'app-radio-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './radio-config-modal.component.html',
  styleUrl: './radio-config-modal.component.scss'
})
export class RadioConfigModalComponent implements OnInit {
  private readonly toastService = inject(ToastService);
  private readonly radioService = inject(RadioService);
  private readonly settingsService = inject(SettingsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  
  // Inputs
  isOpen = input<boolean>(false);
  
  // Outputs
  closeModal = output<void>();
  configSaved = output<RadioConfig>();
  
  // Estado local para edición
  radioName = signal('Radio Kuicat FM');
  userName = signal('');
  frequency = signal(3);
  personality = signal<string>('energetic');
  customPersonality = signal('');
  personality2 = signal<string>('casual');
  customPersonality2 = signal('');
  voice1 = signal('af_bella');
  voice2 = signal('am_michael');
  dualMode = signal(false);
  enableJingles = signal(false);
  enableEffects = signal(true);
  
  // Datos del backend
  voices = signal<RadioVoice[]>([]);
  personalities = signal<RadioPersonalityPreset[]>([]);
  
  // Estados
  loading = signal(false);
  saving = signal(false);
  activating = signal(false);
  
  // Estado del radio (desde servicio)
  radioEnabled = this.radioService.isEnabled;
  
  // Voces filtradas
  femaleVoices = signal<RadioVoice[]>([]);
  maleVoices = signal<RadioVoice[]>([]);
  
  constructor() {
    // Efecto para cargar datos cuando se abre
    effect(() => {
      if (this.isOpen()) {
        this.loadData();
      }
    });
  }
  
  ngOnInit(): void {
    this.loadVoicesAndPersonalities();
  }
  
  private async loadVoicesAndPersonalities(): Promise<void> {
    this.radioService.getVoices().subscribe({
      next: (voices) => {
        this.voices.set(voices);
        this.femaleVoices.set(voices.filter(v => v.gender === 'female'));
        this.maleVoices.set(voices.filter(v => v.gender === 'male'));
      },
      error: (err) => console.error('Error cargando voces:', err)
    });
    
    this.radioService.getPersonalities().subscribe({
      next: (personalities) => this.personalities.set(personalities),
      error: (err) => console.error('Error cargando personalidades:', err)
    });
  }
  
  private async loadData(): Promise<void> {
    this.loading.set(true);
    
    try {
      const config = await this.radioService.loadConfig();
      
      this.radioName.set(config.radioName || 'Radio Kuicat FM');
      this.userName.set(config.userName || '');
      this.frequency.set(config.frequency || 3);
      this.personality.set(config.personality || 'energetic');
      this.customPersonality.set(config.customPersonality || '');
      this.personality2.set(config.personality2 || 'casual');
      this.customPersonality2.set(config.customPersonality2 || '');
      this.voice1.set(config.voice1 || 'af_bella');
      this.voice2.set(config.voice2 || 'am_michael');
      this.dualMode.set(config.dualMode || false);
      this.enableJingles.set(config.enableJingles || false);
      this.enableEffects.set(config.enableEffects ?? true);
    } catch (err) {
      console.error('Error cargando config de radio:', err);
      this.toastService.error('Error loading radio config');
    } finally {
      this.loading.set(false);
    }
  }
  
  onClose(): void {
    this.closeModal.emit();
  }
  
  async onSave(): Promise<void> {
    this.saving.set(true);
    
    try {
      const config = await this.radioService.updateConfig({
        radioName: this.radioName(),
        userName: this.userName() || undefined,
        frequency: this.frequency(),
        personality: this.personality() as any,
        customPersonality: this.personality() === 'custom' ? this.customPersonality() : undefined,
        personality2: this.dualMode() ? this.personality2() as any : undefined,
        customPersonality2: this.dualMode() && this.personality2() === 'custom' ? this.customPersonality2() : undefined,
        voice1: this.voice1(),
        voice2: this.dualMode() ? this.voice2() : undefined,
        dualMode: this.dualMode(),
        enableJingles: this.enableJingles(),
        enableEffects: this.enableEffects()
      });
      
      this.toastService.success('Radio config saved!');
      this.configSaved.emit(config);
      this.closeModal.emit();
    } catch (err) {
      console.error('Error guardando config:', err);
      this.toastService.error('Error saving radio config');
    } finally {
      this.saving.set(false);
    }
  }
  
  getVoiceName(voiceId: string): string {
    const voice = this.voices().find(v => v.id === voiceId);
    return voice ? `${voice.name} (${voice.accent})` : voiceId;
  }
  
  getVoiceLabel(voice: RadioVoice): string {
    const quality = voice.quality === 'A' ? '⭐' : voice.quality === 'B' ? '' : '⚡';
    return `${voice.name} ${quality}`;
  }
  
  /**
   * Guarda la configuración y activa el modo radio.
   */
  async onSaveAndActivate(): Promise<void> {
    // 1. Validar API keys
    try {
      const hasOpenAI = await this.settingsService.hasApiKey(SettingsService.OPENAI_API_KEY).toPromise();
      if (!hasOpenAI) {
        this.toastService.error('Configura tu API key de OpenAI en ⚙️ Ajustes');
        return;
      }
      
      const hasReplicate = await this.settingsService.hasApiKey(SettingsService.REPLICATE_API_KEY).toPromise();
      if (!hasReplicate) {
        this.toastService.error('Configura tu API key de Replicate en ⚙️ Ajustes para el TTS');
        return;
      }
    } catch {
      this.toastService.error('Error al verificar API keys');
      return;
    }
    
    // 2. Guardar y activar (sin confirmación - el usuario ya hizo click en "Save & Go Live")
    this.activating.set(true);
    const radioName = this.radioName() || 'Radio Kuicat';
    
    try {
      // Guardar configuración primero
      await this.radioService.updateConfig({
        radioName: this.radioName(),
        userName: this.userName() || undefined,
        frequency: this.frequency(),
        personality: this.personality() as any,
        customPersonality: this.personality() === 'custom' ? this.customPersonality() : undefined,
        personality2: this.dualMode() ? this.personality2() as any : undefined,
        customPersonality2: this.dualMode() && this.personality2() === 'custom' ? this.customPersonality2() : undefined,
        voice1: this.voice1(),
        voice2: this.dualMode() ? this.voice2() : undefined,
        dualMode: this.dualMode(),
        enableJingles: this.enableJingles(),
        enableEffects: this.enableEffects()
      });
      
      // Activar radio
      await this.radioService.toggle();
      
      this.toastService.success(`🎙️ ${radioName} está en vivo!`);
      this.closeModal.emit();
    } catch (err) {
      console.error('Error activating radio:', err);
      this.toastService.error('Error al activar el modo radio');
    } finally {
      this.activating.set(false);
    }
  }
  
  /**
   * Desactiva el modo radio.
   */
  async onDeactivate(): Promise<void> {
    try {
      await this.radioService.toggle();
      this.toastService.info('📻 Modo Radio desactivado');
    } catch (err) {
      console.error('Error deactivating radio:', err);
      this.toastService.error('Error al desactivar el radio');
    }
  }
}
