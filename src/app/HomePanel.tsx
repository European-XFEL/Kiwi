import React from 'react';

const HomePanel: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Kiwi';
  }, []);

  return (
    <div
      data-testid="home-panel"
      className="flex justify-center min-h-full p-4"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Kiwi</h1>
          <p className="text-muted-foreground">
            View Karabo scenes in the browser
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePanel;
