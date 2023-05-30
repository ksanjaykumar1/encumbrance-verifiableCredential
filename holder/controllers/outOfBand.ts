import express from 'express';
import qrcode from 'qrcode-terminal';
import { agent, initialOutOfBandRecord } from '../integration/integration';

const getInvitation = async (req: express.Request, res: express.Response) => {
  const invitationUrl = initialOutOfBandRecord.outOfBandInvitation.toUrl({
    domain: 'https://example.org',
  });
  console.log(`Invitation URL ${invitationUrl}`);
  qrcode.generate(invitationUrl, { small: true });
  res.status(200).json({ invitationUrl });
};

const receiveInvitation = async (
  req: express.Request,
  res: express.Response
) => {
  const { invitationUrl } = req.body;

  const { connectionRecord } = await agent.oob.receiveInvitationFromUrl(
    invitationUrl
  );
  res.status(200).json({ connectionRecord });
};

export { getInvitation, receiveInvitation };
