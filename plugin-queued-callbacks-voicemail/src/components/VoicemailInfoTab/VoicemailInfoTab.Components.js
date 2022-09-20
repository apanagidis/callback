import { styled } from '@twilio/flex-ui';

export const Container = styled('div')`
  label {
    cursor: text !important;
  }
`;

export const ButtonsContainer = styled('div')`
  margin-bottom: 10px;
`;

export const PlayerContainer = styled('div')`
  width: 100%;
  margin-bottom: 10px;
`;

export const Player = styled('audio')`
  width: 100%;
`;

export const TranscriptContainer = styled('div')`
  margin-bottom: 10px;
  margin-left: auto;
  margin-right: auto;
  // Reducing width to allow full TextArea border to display
  width: 99%;
`;

export const DetailsContainer = styled('div')`
  margin-bottom: 10px;
`;
