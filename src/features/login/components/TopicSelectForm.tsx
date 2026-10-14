import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { getConfig } from '@/lib/singletons/api';
import { ActivityStatus, TopicServerMap } from '../auth.types';
import { useLoginContext } from '../LoginContext';
import { useServerProbe } from '../hooks/useServerProbe';

export type TopicSelectFormProps = {
  topicServerMap: TopicServerMap;
};

export default function TopicSelectForm({
  topicServerMap,
}: TopicSelectFormProps) {
  const { setHost, setPort, activityStatus } = useLoginContext();
  const { doProbeServer } = useServerProbe();
  const availableTopics = Object.keys(topicServerMap);
  const [selectedTopic, setSelectedTopic] = useState(() => {
    const lastTopic = getConfig().lastTopic;
    return topicServerMap[lastTopic] ? lastTopic : availableTopics[0];
  });
  const latestSelectedTopicRef = useRef(selectedTopic);
  const selectedServer = topicServerMap[selectedTopic];

  useEffect(() => {
    latestSelectedTopicRef.current = selectedTopic;
    if (!selectedServer) return;
    setHost(selectedServer.hostname);
    setPort(String(selectedServer.hostport));
    doProbeServer(selectedServer.hostname, selectedServer.hostport);
  }, [selectedTopic, selectedServer, setHost, setPort, doProbeServer]);

  useEffect(() => {
    return () => {
      getConfig().lastTopic = latestSelectedTopicRef.current;
    };
  }, []);

  return (
    <Card data-testid="topic-select-form">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4 text-sm font-semibold">
          <span>GUI SERVER</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gui-server-topic">Topic</Label>
          <Select
            value={selectedTopic}
            onValueChange={setSelectedTopic}
            disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
          >
            <SelectTrigger
              id="gui-server-topic"
              data-testid="login-topic"
              className="w-full"
            >
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {availableTopics.map((topic) => (
                <SelectItem
                  key={topic}
                  value={topic}
                  data-testid={`login-topic-option-${topic}`}
                >
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 gap-4 items-start">
          <div className="col-span-3 space-y-2">
            <Label>Hostname</Label>
            <div
              data-testid="login-host-display"
              className="min-h-9 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
            >
              {selectedServer?.hostname ?? ''}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <div
              data-testid="login-port-display"
              className="min-h-9 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
            >
              {selectedServer ? String(selectedServer.hostport) : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
