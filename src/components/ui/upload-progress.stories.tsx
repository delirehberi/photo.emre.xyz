import type { Meta, StoryObj } from '@storybook/react';
import { UploadProgress } from './upload-progress';

const meta: Meta<typeof UploadProgress> = {
  title: 'Media/UploadProgress',
  component: UploadProgress,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: [
        'idle',
        'hashing',
        'authorizing',
        'uploading',
        'completed',
        'error',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof UploadProgress>;

export const HashingState: Story = {
  args: {
    fileName: 'sunset_over_bosphorus.jpg',
    fileSize: 4520100,
    dimensions: { width: 3840, height: 2160 },
    status: 'hashing',
  },
};

export const AuthorizingState: Story = {
  args: {
    fileName: 'sunset_over_bosphorus.jpg',
    fileSize: 4520100,
    dimensions: { width: 3840, height: 2160 },
    sha256: '44fb7b05646e77bc7e2705e17b427adfb69b0a91d9d1743cf3fdf8cd8157aaa3',
    status: 'authorizing',
  },
};

export const UploadingState: Story = {
  args: {
    fileName: 'sunset_over_bosphorus.jpg',
    fileSize: 4520100,
    dimensions: { width: 3840, height: 2160 },
    sha256: '44fb7b05646e77bc7e2705e17b427adfb69b0a91d9d1743cf3fdf8cd8157aaa3',
    status: 'uploading',
    progress: 68,
  },
};

export const CompletedState: Story = {
  args: {
    fileName: 'sunset_over_bosphorus.jpg',
    fileSize: 4520100,
    dimensions: { width: 3840, height: 2160 },
    sha256: '44fb7b05646e77bc7e2705e17b427adfb69b0a91d9d1743cf3fdf8cd8157aaa3',
    status: 'completed',
    progress: 100,
  },
};

export const ErrorState: Story = {
  args: {
    fileName: 'huge_raw_photo.cr3',
    fileSize: 120500000,
    status: 'error',
    errorMessage: 'Upload exceeds maximum allowable size of 100MB',
    onRetry: () => console.log('Retrying upload...'),
  },
};
