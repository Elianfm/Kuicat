import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-next-song-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './next-song-card.component.html',
  styleUrl: './next-song-card.component.scss'
})
export class NextSongCardComponent {
  title = input('Siguiente Canción');
  artist = input('Artista');
  cover = input('img/default-cover.webp');
}
