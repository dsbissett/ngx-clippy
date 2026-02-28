import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClippyAgentComponent } from './components/clippy-agent/clippy-agent.component';

/**
 * Main module for ngx-clippy library
 * Exports the ClippyAgentComponent for use in Angular applications
 */
@NgModule({
  imports: [CommonModule, ClippyAgentComponent],
  exports: [ClippyAgentComponent]
})
export class NgxClippyModule {}
