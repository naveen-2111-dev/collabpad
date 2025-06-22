function generateRoomInvitationEmail(roomName: string, inviterEmail: string, joinLink: string): string {

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Room Invitation</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="30" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center">
                <h2 style="margin: 0 0 16px;">Hello 👋,</h2>
                <p style="font-size: 16px; margin: 0 0 16px;"><strong>${inviterEmail}</strong> has invited you to join the room:</p>
                <h3 style="color: #007bff; margin: 0 0 24px;">"${roomName}"</h3>
                <a href="${joinLink}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                   Join Room
                </a>
                <p style="font-size: 14px; color: #777; margin-top: 32px;">If you didn't expect this, feel free to ignore this email.</p>
                <p style="margin-top: 40px; font-size: 14px;">—${roomName}  Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default generateRoomInvitationEmail;