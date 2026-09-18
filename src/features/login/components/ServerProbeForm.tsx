import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/api';
import { Label } from '@/components/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/api';
import { getConfig } from '@/lib/singletons/api';
import type { TopicServerMap } from '../auth.types';
import { decodeTopicServerMap } from '../utils';

export type ServerProbeFormProps = {
  host: string;
  port: string;
  onHostChange: (host: string) => void;
  onPortChange: (port: string) => void;
  onCommit?: (host: string, port: string) => void;
  topicServerSettings?: string;
  topic?: string;
  disabled?: boolean;
};

export default function ServerProbeForm({
  host,
  port,
  onHostChange,
  onPortChange,
  onCommit,
  topicServerSettings,
  topic,
  disabled = false,
}: ServerProbeFormProps) {
  const lastTopic = getConfig().lastTopic;
  const initialLastTopicRef = useRef(lastTopic);
  const topicServerMap = useMemo<TopicServerMap | undefined>(
    () => decodeTopicServerMap(topicServerSettings),
    [topicServerSettings]
  );
  const availableTopics = useMemo(
    () => Object.keys(topicServerMap ?? {}),
    [topicServerMap]
  );
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const latestSelectedTopicRef = useRef(selectedTopic);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault(); // Prevents default form submission if inside a form tag
      onCommit?.(host, port);
    }
  };

  useEffect(() => {
    if (availableTopics.length == 0) {
      setSelectedTopic('');
      return;
    }

    if (topic && topicServerMap?.[topic]) {
      setSelectedTopic(topic);
      return;
    }

    setSelectedTopic((currentTopic) =>
      currentTopic && topicServerMap?.[currentTopic]
        ? currentTopic
        : availableTopics.length > 0 &&
            initialLastTopicRef.current &&
            topicServerMap?.[initialLastTopicRef.current]
          ? initialLastTopicRef.current
          : availableTopics[0]
    );
  }, [availableTopics, topicServerMap, topic]);

  useEffect(() => {
    latestSelectedTopicRef.current = selectedTopic;
  }, [selectedTopic]);

  // Updates the persisted value of lastTopic on form unmount
  useEffect(() => {
    return () => {
      const config = getConfig();
      config.lastTopic = latestSelectedTopicRef.current;
    };
  }, []);

  // Keep hostname:port in sync with the currently selected topic, triggering
  // host and port change handlers when changes are detected.
  useEffect(() => {
    if (availableTopics.length == 0 || !selectedTopic) {
      return;
    }

    const server = topicServerMap?.[selectedTopic];
    if (!server) {
      return;
    }

    if (host !== server.hostname) {
      onHostChange(server.hostname);
    }
    const nextPort = String(server.hostport);
    if (port !== nextPort) {
      onPortChange(nextPort);
    }
  }, [topicServerMap, host, onHostChange, onPortChange, port, selectedTopic]);

  const selectedServer =
    selectedTopic && topicServerMap ? topicServerMap[selectedTopic] : undefined;

  return (
    <Card data-testid="server-probe-form">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4 text-sm font-semibold">
          <span>GUI SERVER</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {availableTopics.length > 0 ? (
          // By Topic mode
          <>
            <div className="space-y-2">
              <Label htmlFor="gui-server-topic">Topic</Label>
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
                disabled={disabled}
              >
                <SelectTrigger id="gui-server-topic" className="w-full">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((availableTopic) => (
                    <SelectItem key={availableTopic} value={availableTopic}>
                      {availableTopic}
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
          </>
        ) : (
          // By Host:Port mode
          <>
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname</Label>
              <Input
                data-testid="login-host"
                id="hostname"
                value={host}
                onChange={(e) => onHostChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                inputMode="text"
                autoComplete="host"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  data-testid="login-port"
                  id="port"
                  value={port}
                  onChange={(e) => onPortChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              {topic && (
                <div className="col-span-2 text-right text-sm text-muted-foreground">
                  Topic:{' '}
                  <span className="font-medium break-words">{topic}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
