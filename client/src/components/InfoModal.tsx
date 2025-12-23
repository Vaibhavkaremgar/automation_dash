import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal';
import { Button } from './ui/Button';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InfoModal({ open, onClose }: InfoModalProps) {
  const navigate = useNavigate();

  const handleOk = () => {
    onClose();
    navigate('/profiles');
  };

  return (
    <Modal open={open} onClose={() => {}} title="Important Information">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="text-slate-300 space-y-4 text-sm leading-relaxed">
          <p>
            We just wanted to keep you informed about a few things regarding the current stage of the application:
          </p>
          
          <p>
            We are currently in the development and redeployment phase, so you might occasionally notice small issues or unexpected behavior. If you face anything unusual, please note it down and let us know — it will really help us improve things.
          </p>
          
          <p>
            Since the application is running on a basic server setup right now, during deployments or redeployments, message logs and user profiles may sometimes get deleted. If that happens, we may request you to create the profiles again.
          </p>
          
          <p>
            Please make sure that all required fields are filled, especially name and mobile number, as these are mandatory for the system to work correctly.
          </p>
          
          <p>
            While using the dashboard, if you face any issues or have suggestions, kindly note them and share them with us.
          </p>
          
          <p>
            All the feedback and issues you report will be reviewed and addressed in the next phase of updates.
          </p>
          
          <p className="text-center font-medium">
            Thank you for your support and patience while we continue improving the system 🙏
          </p>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button onClick={handleOk} className="px-8">
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}